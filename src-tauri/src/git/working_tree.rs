// @Architecture(descriptionShort="Builds a working-tree diff with eligible untracked files")
use std::collections::HashSet;
use std::fs;
use std::path::Path;

use super::git_command;

pub struct WorkingTreeDiffInput<'a> {
    pub path: &'a str,
    pub base_ref: &'a str,
    pub eligible_paths: &'a [String],
    pub ignore_submodules: bool,
}

pub fn working_tree_diff(input: WorkingTreeDiffInput<'_>) -> Result<String, String> {
    let mut diff = tracked_diff(input.path, input.base_ref, input.ignore_submodules)?;
    let eligible: HashSet<&str> = input.eligible_paths.iter().map(String::as_str).collect();
    let submodule_roots = if input.ignore_submodules {
        super::list_submodule_paths(input.path)?
    } else {
        Vec::new()
    };
    for untracked in untracked_paths(input.path)? {
        let normalized = untracked.replace('\\', "/");
        if !eligible.contains(normalized.as_str()) {
            continue;
        }
        if under_submodule(&normalized, &submodule_roots) {
            continue;
        }
        let content = fs::read_to_string(Path::new(input.path).join(&untracked))
            .map_err(|error| format!("failed to read untracked file {untracked}: {error}"))?;
        append_added_file(&mut diff, &normalized, &content);
    }
    Ok(diff)
}

fn under_submodule(path: &str, roots: &[String]) -> bool {
    roots.iter().any(|root| path == root || path.starts_with(&format!("{root}/")))
}

fn tracked_diff(path: &str, base_ref: &str, ignore_submodules: bool) -> Result<String, String> {
    let mut args = vec!["diff", "-M", "--no-ext-diff"];
    if ignore_submodules {
        args.push("--ignore-submodules=all");
    }
    args.push(base_ref);
    args.push("--");
    git_text(path, &args)
}

fn untracked_paths(path: &str) -> Result<Vec<String>, String> {
    let bytes = git_bytes(path, &["ls-files", "--others", "--exclude-standard", "-z"])?;
    Ok(bytes
        .split(|byte| *byte == 0)
        .filter(|entry| !entry.is_empty())
        .map(|entry| String::from_utf8_lossy(entry).into_owned())
        .collect())
}

fn append_added_file(diff: &mut String, path: &str, content: &str) {
    if !diff.is_empty() && !diff.ends_with('\n') {
        diff.push('\n');
    }
    let line_count = content.lines().count();
    diff.push_str(&format!(
        "diff --git a/{path} b/{path}\nnew file mode 100644\n--- /dev/null\n+++ b/{path}\n"
    ));
    if line_count == 0 {
        return;
    }
    diff.push_str(&format!("@@ -0,0 +1,{line_count} @@\n"));
    for line in content.lines() {
        diff.push('+');
        diff.push_str(line);
        diff.push('\n');
    }
    if !content.ends_with('\n') {
        diff.push_str("\\ No newline at end of file\n");
    }
}

fn git_text(path: &str, args: &[&str]) -> Result<String, String> {
    Ok(String::from_utf8_lossy(&git_bytes(path, args)?).into_owned())
}

fn git_bytes(path: &str, args: &[&str]) -> Result<Vec<u8>, String> {
    let output = git_command()
        .args(["-C"])
        .arg(Path::new(path))
        .args(args)
        .output()
        .map_err(|error| format!("failed to run git: {error}"))?;
    if output.status.success() {
        return Ok(output.stdout);
    }
    Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn includes_tracked_and_only_eligible_untracked_files() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        run_git(root, &["init"]);
        run_git(root, &["config", "user.email", "test@example.com"]);
        run_git(root, &["config", "user.name", "Test"]);
        fs::write(root.join(".gitignore"), "node_modules/\n").unwrap();
        fs::write(root.join("tracked.ts"), "export const value = 1;\n").unwrap();
        run_git(root, &["add", "."]);
        run_git(root, &["commit", "-m", "base"]);
        fs::write(root.join("tracked.ts"), "export const value = 2;\n").unwrap();
        fs::write(root.join("new.ts"), "export const fresh = true;\n").unwrap();
        fs::write(root.join("notes.txt"), "not supported\n").unwrap();
        fs::create_dir(root.join("node_modules")).unwrap();
        fs::write(root.join("node_modules").join("noise.ts"), "ignored\n").unwrap();

        let diff = working_tree_diff(WorkingTreeDiffInput {
            path: root.to_str().unwrap(),
            base_ref: "HEAD",
            eligible_paths: &["tracked.ts".into(), "new.ts".into()],
            ignore_submodules: false,
        })
        .unwrap();

        assert!(diff.contains("tracked.ts"));
        assert!(diff.contains("new file mode"));
        assert!(diff.contains("+export const fresh = true;"));
        assert!(!diff.contains("notes.txt"));
        assert!(!diff.contains("node_modules"));
    }

    #[test]
    fn ignore_submodules_skips_dirty_submodule_gitlinks() {
        let dir = tempdir().unwrap();
        let root = dir.path();
        let child = root.join("child");
        run_git(root, &["init"]);
        run_git(root, &["config", "user.email", "test@example.com"]);
        run_git(root, &["config", "user.name", "Test"]);
        fs::write(root.join("tracked.ts"), "export const value = 1;\n").unwrap();
        run_git(root, &["add", "."]);
        run_git(root, &["commit", "-m", "base"]);

        fs::create_dir(&child).unwrap();
        run_git(&child, &["init"]);
        run_git(&child, &["config", "user.email", "test@example.com"]);
        run_git(&child, &["config", "user.name", "Test"]);
        fs::write(child.join("lib.ts"), "export const child = 1;\n").unwrap();
        run_git(&child, &["add", "."]);
        run_git(&child, &["commit", "-m", "child init"]);
        run_git(root, &["submodule", "add", child.to_str().unwrap(), "child"]);
        run_git(root, &["commit", "-m", "add submodule"]);

        fs::write(child.join("lib.ts"), "export const child = 2;\n").unwrap();
        run_git(&child, &["add", "."]);
        run_git(&child, &["commit", "-m", "child change"]);

        let path = root.to_str().unwrap();
        let eligible = vec!["tracked.ts".into(), "child/lib.ts".into()];
        let with_submodule = working_tree_diff(WorkingTreeDiffInput {
            path,
            base_ref: "HEAD",
            eligible_paths: &eligible,
            ignore_submodules: false,
        })
        .unwrap();
        let without_submodule = working_tree_diff(WorkingTreeDiffInput {
            path,
            base_ref: "HEAD",
            eligible_paths: &eligible,
            ignore_submodules: true,
        })
        .unwrap();

        assert!(with_submodule.contains("child"));
        assert!(!without_submodule.contains("child"));
    }

    fn run_git(root: &Path, args: &[&str]) {
        let status = git_command()
            .args(["-C"])
            .arg(root)
            .args(args)
            .status()
            .unwrap();
        assert!(status.success());
    }
}

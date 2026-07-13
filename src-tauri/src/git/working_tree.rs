// @Architecture(descriptionShort="Builds a working-tree diff with eligible untracked files")
use std::collections::HashSet;
use std::fs;
use std::path::Path;
use std::process::Command;

pub fn working_tree_diff(
    path: &str,
    base_ref: &str,
    eligible_paths: &[String],
) -> Result<String, String> {
    let mut diff = git_text(path, &["diff", "--no-ext-diff", base_ref, "--"])?;
    let eligible: HashSet<&str> = eligible_paths.iter().map(String::as_str).collect();
    for untracked in untracked_paths(path)? {
        let normalized = untracked.replace('\\', "/");
        if !eligible.contains(normalized.as_str()) {
            continue;
        }
        let content = fs::read_to_string(Path::new(path).join(&untracked))
            .map_err(|error| format!("failed to read untracked file {untracked}: {error}"))?;
        append_added_file(&mut diff, &normalized, &content);
    }
    Ok(diff)
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
    let output = Command::new("git")
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

        let diff = working_tree_diff(
            root.to_str().unwrap(),
            "HEAD",
            &["tracked.ts".into(), "new.ts".into()],
        )
        .unwrap();

        assert!(diff.contains("tracked.ts"));
        assert!(diff.contains("new file mode"));
        assert!(diff.contains("+export const fresh = true;"));
        assert!(!diff.contains("notes.txt"));
        assert!(!diff.contains("node_modules"));
    }

    fn run_git(root: &Path, args: &[&str]) {
        let status = Command::new("git")
            .args(["-C"])
            .arg(root)
            .args(args)
            .status()
            .unwrap();
        assert!(status.success());
    }
}

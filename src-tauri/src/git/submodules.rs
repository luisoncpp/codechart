// @Architecture(descriptionShort="Lists git submodule root paths from the index")
use std::path::Path;

use super::git_command;

/// Returns index paths recorded as gitlinks (mode 160000).
pub fn list_submodule_paths(path: &str) -> Result<Vec<String>, String> {
    let bytes = git_bytes(path, &["ls-files", "-s"])?;
    let text = String::from_utf8_lossy(&bytes);
    Ok(text
        .lines()
        .filter_map(parse_gitlink_path)
        .map(|entry| entry.replace('\\', "/"))
        .collect())
}

fn parse_gitlink_path(line: &str) -> Option<String> {
    let (meta, path) = line.split_once('\t')?;
    if !meta.starts_with("160000 ") {
        return None;
    }
    Some(path.to_string())
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
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn lists_registered_submodule_roots() {
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

        let paths = list_submodule_paths(root.to_str().unwrap()).unwrap();
        assert_eq!(paths, vec!["child".to_string()]);
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

// @Architecture(descriptionShort="In-memory ProjectSource for tests and fixtures")

use std::collections::{BTreeSet, HashMap};

use super::{ProjectSource, ProjectSourceError};

pub struct MemoryProjectSource {
    files: HashMap<String, String>,
    /// Files that exist in the tree but whose content was deliberately not loaded.
    /// They still have to be listed — the unreal/unity/ignore rules read the file
    /// *list*, so hiding a `.uproject` or a `.meta` would change the analysis — but
    /// reading one is a bug, and surfaces as `NotFound` rather than as empty content.
    listing_only: BTreeSet<String>,
}

impl MemoryProjectSource {
    pub fn new(files: HashMap<String, String>) -> Self {
        Self {
            files,
            listing_only: BTreeSet::new(),
        }
    }

    /// A source that lists more files than it can read. `listing_only` paths that also
    /// carry content are ignored — content always wins.
    pub fn with_listing(files: HashMap<String, String>, listing_only: BTreeSet<String>) -> Self {
        Self {
            files,
            listing_only,
        }
    }
}

impl ProjectSource for MemoryProjectSource {
    fn list_files(&self) -> Result<Vec<String>, ProjectSourceError> {
        let mut paths: Vec<String> = self.files.keys().cloned().collect();
        paths.extend(
            self.listing_only
                .iter()
                .filter(|path| !self.files.contains_key(*path))
                .cloned(),
        );
        paths.sort();
        Ok(paths)
    }

    fn read_file(&self, path: &str) -> Result<String, ProjectSourceError> {
        self.files
            .get(path)
            .cloned()
            .ok_or_else(|| ProjectSourceError::NotFound(path.into()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lists_and_reads_files() {
        let mut files = HashMap::new();
        files.insert("a.ts".into(), "export const a = 1;".into());
        let source = MemoryProjectSource::new(files);

        assert_eq!(source.list_files().unwrap(), vec!["a.ts"]);
        assert_eq!(source.read_file("a.ts").unwrap(), "export const a = 1;");
    }

    /// A skipped blob must still be *listed* — `is_unreal_project` and the unity meta
    /// index scan the file list — but reading it is `NotFound`, not empty content, so a
    /// wrongly-skipped file becomes a visible parse diagnostic instead of a silent
    /// zero-import module.
    #[test]
    fn lists_content_free_paths_but_refuses_to_read_them() {
        let mut files = HashMap::new();
        files.insert("a.ts".into(), "export const a = 1;".into());
        let source = MemoryProjectSource::with_listing(
            files,
            BTreeSet::from(["Game.uproject".to_string(), "art/logo.png".to_string()]),
        );

        assert_eq!(
            source.list_files().unwrap(),
            vec!["Game.uproject", "a.ts", "art/logo.png"]
        );
        assert!(matches!(
            source.read_file("art/logo.png"),
            Err(ProjectSourceError::NotFound(_))
        ));
    }
}

use std::collections::HashMap;

use super::{ProjectSource, ProjectSourceError};

pub struct MemoryProjectSource {
    files: HashMap<String, String>,
}

impl MemoryProjectSource {
    pub fn new(files: HashMap<String, String>) -> Self {
        Self { files }
    }
}

impl ProjectSource for MemoryProjectSource {
    fn list_files(&self) -> Result<Vec<String>, ProjectSourceError> {
        let mut paths: Vec<String> = self.files.keys().cloned().collect();
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
}

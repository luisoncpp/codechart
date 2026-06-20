use std::path::PathBuf;

use super::{ProjectSource, ProjectSourceError};

pub struct FsProjectSource {
    root: PathBuf,
}

impl FsProjectSource {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }
}

impl ProjectSource for FsProjectSource {
    fn list_files(&self) -> Result<Vec<String>, ProjectSourceError> {
        Ok(vec![])
    }

    fn read_file(&self, path: &str) -> Result<String, ProjectSourceError> {
        let full = self.root.join(path);
        std::fs::read_to_string(&full).map_err(ProjectSourceError::Io)
    }
}

// @Architecture(descriptionShort="ProjectSource trait for filesystem and in-memory reads")

use thiserror::Error;

pub mod fs_source;
pub mod memory_source;

pub use fs_source::FsProjectSource;
pub use memory_source::MemoryProjectSource;

#[derive(Debug, Error)]
pub enum ProjectSourceError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("not found: {0}")]
    NotFound(String),
}

pub trait ProjectSource: Send + Sync {
    fn list_files(&self) -> Result<Vec<String>, ProjectSourceError>;
    fn read_file(&self, path: &str) -> Result<String, ProjectSourceError>;
}

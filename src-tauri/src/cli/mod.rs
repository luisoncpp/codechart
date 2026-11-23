// @Architecture(descriptionShort="Headless CLI: parse, groups, analyze, check, and help")
// Dev CLI library surface used by `bin/codechart-cli.rs`.

mod check;
mod help;
mod impact;
mod version;

pub use check::run_check;
pub use help::{run_help, wants_help};
pub use impact::{analyze_fs, compute_impact, extract_diff_paths, run_impact, ImpactArgs};
pub use version::run_version;

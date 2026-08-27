// @Architecture(descriptionShort="Headless CLI: parse, groups, analyze, check, and help")
// Dev CLI library surface used by `bin/codechart-cli.rs`.

mod check;
mod help;

pub use check::run_check;
pub use help::{run_help, wants_help};

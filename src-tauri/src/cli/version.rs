// Version reporting for the headless CLI: `version`, `--version`, `-V`.

use std::process::ExitCode;

pub fn version_text() -> String {
    format!("codechart-cli {}", env!("CARGO_PKG_VERSION"))
}

pub fn run_version() -> ExitCode {
    println!("{}", version_text());
    ExitCode::SUCCESS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_text_names_the_binary_and_crate_version() {
        let text = version_text();
        assert!(text.starts_with("codechart-cli "));
        assert!(text.contains(env!("CARGO_PKG_VERSION")));
        assert!(text.ends_with(char::is_numeric));
    }
}

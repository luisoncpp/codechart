// @Architecture(descriptionShort="Resolves disconnected-by-default config into module ids")
use std::collections::BTreeSet;

use crate::contract::Diagnostic;
use crate::project_config::{config_error, GroupDef};

use super::matcher::join_rel;

/// Resolved disconnect defaults for one group.
pub struct DisconnectConfig {
    pub by_default: bool,
    pub module_ids: Vec<String>,
    pub diagnostics: Vec<Diagnostic>,
}

/// Map `disconnectedModules` paths to member module ids; unknown paths become configErrors.
pub fn resolve_disconnect(def: &GroupDef, members: &BTreeSet<String>) -> DisconnectConfig {
    if def.disconnected_modules.is_empty() {
        return DisconnectConfig {
            by_default: def.disconnected,
            module_ids: vec![],
            diagnostics: vec![],
        };
    }
    let mut module_ids = Vec::new();
    let mut diagnostics = Vec::new();
    for entry in &def.disconnected_modules {
        let path = join_rel(&def.dir, entry);
        if members.contains(&path) {
            module_ids.push(path);
            continue;
        }
        diagnostics.push(config_error(
            &format!("disconnect:{}:{entry}", def.id),
            &format!(
                "disconnectedModules entry `{entry}` does not name a member of group `{}`",
                def.id
            ),
        ));
    }
    module_ids.sort();
    DisconnectConfig {
        by_default: def.disconnected,
        module_ids,
        diagnostics,
    }
}

use crate::contract::{GroupNode, ModuleMetrics, ModuleNode, ProjectGraph};

#[tauri::command]
pub fn get_sample_graph() -> ProjectGraph {
    ProjectGraph {
        version: 1,
        root: "/sample".into(),
        groups: vec![GroupNode {
            id: "core".into(),
            label: "Core".into(),
            parent_id: None,
            color: Some("#3b82f6".into()),
            facade_module_ids: vec!["src/index.ts".into()],
            ..Default::default()
        }],
        modules: vec![ModuleNode {
            id: "src/index.ts".into(),
            path: "src/index.ts".into(),
            label: "index.ts".into(),
            language: crate::contract::Language::TypeScript,
            group_id: Some("core".into()),
            is_facade: true,
            metrics: ModuleMetrics { loc: 12, ..Default::default() },
            annotation: None,
        }],
        edges: vec![],
        diagnostics: vec![],
    }
}

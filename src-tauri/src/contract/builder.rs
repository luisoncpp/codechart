// @Architecture(descriptionShort="Fluent builder assembling and validating ProjectGraph instances")

use super::types::{Diagnostic, Edge, GroupNode, ModuleNode, ProjectGraph};
use super::validate::{validate, BuildError};

#[derive(Debug, Default)]
pub struct ProjectGraphBuilder {
    version: u32,
    root: String,
    groups: Vec<GroupNode>,
    modules: Vec<ModuleNode>,
    edges: Vec<Edge>,
    diagnostics: Vec<Diagnostic>,
}

impl ProjectGraphBuilder {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn version(mut self, version: u32) -> Self {
        self.version = version;
        self
    }

    pub fn root(mut self, root: impl Into<String>) -> Self {
        self.root = root.into();
        self
    }

    pub fn group(mut self, group: GroupNode) -> Self {
        self.groups.push(group);
        self
    }

    pub fn module(mut self, module: ModuleNode) -> Self {
        self.modules.push(module);
        self
    }

    pub fn edge(mut self, edge: Edge) -> Self {
        self.edges.push(edge);
        self
    }

    pub fn diagnostic(mut self, diagnostic: Diagnostic) -> Self {
        self.diagnostics.push(diagnostic);
        self
    }

    /// Validate the five §2.2 invariants and produce the graph, or reject it.
    pub fn build(self) -> Result<ProjectGraph, BuildError> {
        validate(&self.groups, &self.modules, &self.edges)?;
        Ok(ProjectGraph {
            version: self.version,
            root: self.root,
            groups: self.groups,
            modules: self.modules,
            edges: self.edges,
            diagnostics: self.diagnostics,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::contract::types::{
        DiagnosticKind, EdgeKind, Language, ModuleMetrics, Severity,
    };

    #[test]
    fn builds_empty_graph() {
        let graph = ProjectGraphBuilder::new()
            .version(1)
            .root("/tmp")
            .build()
            .expect("empty graph is valid");

        assert_eq!(graph.version, 1);
        assert_eq!(graph.root, "/tmp");
        assert!(graph.modules.is_empty());
    }

    #[test]
    fn builds_sample_graph() {
        let graph = ProjectGraphBuilder::new()
            .version(1)
            .root("/project")
            .group(GroupNode {
                id: "core".into(),
                label: "Core".into(),
                parent_id: None,
                color: None,
                facade_module_ids: vec!["src/index.ts".into()],
                ..Default::default()
            })
            .module(ModuleNode {
                id: "src/index.ts".into(),
                path: "src/index.ts".into(),
                label: "index.ts".into(),
                language: Language::TypeScript,
                group_id: Some("core".into()),
                is_facade: true,
                metrics: ModuleMetrics { loc: 10, ..Default::default() },
                exported_symbols: vec![],
                annotation: None,
            })
            .module(ModuleNode {
                id: "src/lib.ts".into(),
                path: "src/lib.ts".into(),
                label: "lib.ts".into(),
                language: Language::TypeScript,
                group_id: Some("core".into()),
                is_facade: false,
                metrics: ModuleMetrics { loc: 4, ..Default::default() },
                exported_symbols: vec![],
                annotation: None,
            })
            .diagnostic(Diagnostic {
                id: "d1".into(),
                severity: Severity::Warning,
                kind: DiagnosticKind::UnresolvedImport,
                message: "could not resolve ./missing".into(),
                module_id: Some("src/index.ts".into()),
                edge_id: None,
                unresolved_target: Some("./missing".into()),
            })
            .edge(Edge {
                id: "src/index.ts->src/lib.ts:import:0".into(),
                source: "src/index.ts".into(),
                target: "src/lib.ts".into(),
                kind: EdgeKind::Import,
                trigger: "import".into(),
                is_violation: false,
            })
            .build()
            .expect("sample graph is valid");

        assert_eq!(graph.modules.len(), 2);
        assert_eq!(graph.diagnostics.len(), 1);
        assert_eq!(graph.edges.len(), 1);
    }
}

use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub enum EdgeKind {
    Import,
    UnresolvedImport,
    Soft,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub enum Severity {
    Info,
    Warning,
    Error,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub enum DiagnosticKind {
    ParseError,
    UnresolvedImport,
    ConfigError,
    ArchitectureViolation,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum Language {
    TypeScript,
    Tsx,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq, Default)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Annotation {
    #[serde(rename = "type")]
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(rename = "type", optional)]
    pub type_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub group: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub description_short: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub description_long: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub icon: Option<String>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ModuleNode {
    pub id: String,
    pub path: String,
    pub label: String,
    pub language: Language,
    pub group_id: Option<String>,
    pub is_facade: bool,
    pub metrics: ModuleMetrics,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub annotation: Option<Annotation>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq, Default)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ModuleMetrics {
    pub loc: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub churn: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub complexity: Option<u32>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq, Default)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct GroupNode {
    pub id: String,
    pub label: String,
    pub parent_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub color: Option<String>,
    pub facade_module_ids: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub annotation: Option<Annotation>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Edge {
    pub id: String,
    pub source: String,
    pub target: String,
    pub kind: EdgeKind,
    pub trigger: String,
    pub is_violation: bool,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostic {
    pub id: String,
    pub severity: Severity,
    pub kind: DiagnosticKind,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub module_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub edge_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub unresolved_target: Option<String>,
}

#[derive(Serialize, Deserialize, TS, Debug, Clone, PartialEq)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct ProjectGraph {
    pub version: u32,
    pub root: String,
    pub groups: Vec<GroupNode>,
    pub modules: Vec<ModuleNode>,
    pub edges: Vec<Edge>,
    pub diagnostics: Vec<Diagnostic>,
}

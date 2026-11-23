// @Architecture(descriptionShort="Serializable types for persisted Review Stacks and Findings")
use serde::{Deserialize, Serialize};

pub const VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewCohort {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub rationale: String,
    #[serde(default)]
    pub depends_on: Vec<String>,
    #[serde(default)]
    pub module_ids: Vec<String>,
    /// Markdown walkthrough opened in its own preview frame.
    #[serde(default)]
    pub explanation: String,
    /// Line ranges this cohort covers; one file may be split across cohorts.
    #[serde(default)]
    pub hunks: Vec<CohortHunk>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CohortHunk {
    pub path: String,
    #[serde(default = "default_side")]
    pub side: FindingSide,
    pub start_line: u32,
    pub end_line: u32,
}

/// Agent-authored Diff Note: read-only markdown rendered under its line range.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentDiffNote {
    pub id: String,
    pub path: String,
    #[serde(default = "default_side")]
    pub side: FindingSide,
    pub start_line: u32,
    pub end_line: u32,
    pub body: String,
}

fn default_side() -> FindingSide {
    FindingSide::After
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewBlocker {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub finding_id: Option<String>,
    #[serde(default)]
    pub module_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FindingSeverity {
    Critical,
    Major,
    Minor,
    Trivial,
    Info,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FindingSide {
    Before,
    After,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum FindingStatus {
    Open,
    Resolved,
    Dismissed,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewFinding {
    pub id: String,
    pub path: String,
    pub side: FindingSide,
    pub start_line: u32,
    pub end_line: u32,
    pub severity: FindingSeverity,
    #[serde(default)]
    pub category: String,
    pub title: String,
    pub body: String,
    #[serde(default)]
    pub layer_id: Option<String>,
    #[serde(default)]
    pub blocker: bool,
    #[serde(default)]
    pub suggested_fix: Option<String>,
    #[serde(default = "default_status")]
    pub status: FindingStatus,
}

fn default_status() -> FindingStatus {
    FindingStatus::Open
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewStackRecord {
    pub diff_id: String,
    pub title: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub cohorts: Vec<ReviewCohort>,
    #[serde(default)]
    pub blockers: Vec<ReviewBlocker>,
    #[serde(default)]
    pub findings: Vec<ReviewFinding>,
    #[serde(default)]
    pub diff_notes: Vec<AgentDiffNote>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewStacksDocument {
    pub version: u32,
    pub stacks: Vec<ReviewStackRecord>,
}

impl ReviewStacksDocument {
    pub fn empty() -> Self {
        Self {
            version: VERSION,
            stacks: Vec::new(),
        }
    }
}

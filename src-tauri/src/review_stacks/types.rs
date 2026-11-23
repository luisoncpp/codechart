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

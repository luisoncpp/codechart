// @Architecture(descriptionShort="Instance discovery registry (~/.codechart/instances.json) and bearer token generation")
use serde::{Deserialize, Serialize};
use std::collections::hash_map::RandomState;
use std::hash::{BuildHasher, Hasher};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tempfile::NamedTempFile;

const REGISTRY_ENV: &str = "CODECHART_MCP_REGISTRY";

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceEntry {
    pub pid: u32,
    pub port: u16,
    pub token: String,
    pub started_at_ms: u64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstancesRegistry {
    pub version: u32,
    pub instances: Vec<InstanceEntry>,
}

pub fn generate_token() -> String {
    let mut out = String::with_capacity(64);
    for round in 0u64..4 {
        let mut hasher = RandomState::new().build_hasher();
        hasher.write_u64(round);
        hasher.write_u32(std::process::id());
        out.push_str(&format!("{:016x}", hasher.finish()));
    }
    out
}

pub fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn default_registry_path() -> Option<PathBuf> {
    if let Ok(custom) = std::env::var(REGISTRY_ENV) {
        if !custom.trim().is_empty() {
            return Some(PathBuf::from(custom));
        }
    }
    let home = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME"))?;
    Some(PathBuf::from(home).join(".codechart").join("instances.json"))
}

pub fn register_instance(path: &Path, entry: InstanceEntry) -> Result<(), String> {
    let mut reg = read_registry(path);
    reg.version = 1;
    reg.instances.retain(|item| item.pid != entry.pid && item.port != entry.port);
    reg.instances.push(entry);
    write_registry(path, &reg)
}

pub fn unregister_instance(path: &Path, pid: u32, port: u16) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    let mut reg = read_registry(path);
    reg.instances.retain(|item| !(item.pid == pid && item.port == port));
    write_registry(path, &reg)
}

pub fn read_registry(path: &Path) -> InstancesRegistry {
    let Ok(bytes) = std::fs::read(path) else {
        return InstancesRegistry { version: 1, instances: Vec::new() };
    };
    serde_json::from_slice(&bytes).unwrap_or(InstancesRegistry { version: 1, instances: Vec::new() })
}

fn write_registry(path: &Path, registry: &InstancesRegistry) -> Result<(), String> {
    let parent = path.parent().ok_or_else(|| "registry path has no parent".to_string())?;
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let bytes = serde_json::to_vec_pretty(registry).map_err(|e| e.to_string())?;
    let mut temp = NamedTempFile::new_in(parent).map_err(|e| e.to_string())?;
    temp.write_all(&bytes).map_err(|e| e.to_string())?;
    temp.as_file().sync_all().map_err(|e| e.to_string())?;
    temp.persist(path).map_err(|e| e.error.to_string())?;
    Ok(())
}

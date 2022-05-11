use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct Config {
    pub gravity_contract: String,
    pub persistent_peers: Vec<String>,
}

impl Config {
    pub fn read(path: &std::path::PathBuf) -> Config {
        let content = std::fs::read_to_string(path).unwrap();
        serde_yaml::from_str(&content).unwrap()
    }
}

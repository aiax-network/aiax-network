use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Stage {
    Empty,
    ConfigCreated,
    NodeInitialized,
    GenesisWritten,
    KeysCreated,
    ValidatorCreated,
    GravityKeysDelegated,
}

#[derive(Serialize, Deserialize)]
pub struct State {
    pub stage: Stage,
    pub node_id: Option<String>,
    pub validator: Option<String>,
    pub orchestrator: Option<String>,
    pub signer: Option<String>,
}

pub struct StateFile(pub std::path::PathBuf, pub State);

impl StateFile {
    pub fn new(path: std::path::PathBuf) -> Self {
        if !path.exists() {
            return Self(
                path,
                State {
                    stage: Stage::Empty,
                    node_id: None,
                    validator: None,
                    orchestrator: None,
                    signer: None,
                },
            );
        }

        let content = std::fs::read_to_string(&path).unwrap();
        Self(path, serde_json::from_str(&content).unwrap())
    }

    pub fn save(&mut self) {
        std::fs::create_dir_all(self.0.parent().unwrap()).unwrap();
        std::fs::write(&self.0, serde_json::to_string(&self.1).unwrap()).unwrap()
    }
}

#[derive(Clone)]
pub struct Genesis(serde_json::Value);

impl Genesis {
    pub fn read(path: &std::path::PathBuf) -> Genesis {
        let content = std::fs::read_to_string(path).unwrap();
        Genesis(serde_yaml::from_str(&content).unwrap())
    }

    pub fn write(&self, path: &std::path::PathBuf) {
        std::fs::write(&path, serde_json::to_string(&self.0).unwrap()).unwrap()
    }

    pub fn chain_id(&self) -> String {
        self.0["chain_id"].as_str().unwrap().to_owned()
    }
}

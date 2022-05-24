use serde::Deserialize;
use std::io::Write;

pub struct Aiaxd {
    pub bin: std::path::PathBuf,
    pub home: std::path::PathBuf,
    pub password: String,
}

impl Aiaxd {
    pub fn run_with_input(&self, params: Vec<&str>, input: &str) -> std::process::Output {
        let mut child = std::process::Command::new(&self.bin)
            .args(["--home", &self.home.to_string_lossy()])
            .args(params)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .unwrap();

        child
            .stdin
            .take()
            .unwrap()
            .write_all(input.as_bytes())
            .unwrap();

        let output = child.wait_with_output().unwrap();
        assert_eq!(output.status.success(), true);

        output
    }

    pub fn run(&self, params: Vec<&str>) -> std::process::Output {
        let output = std::process::Command::new(&self.bin)
            .args(["--home", &self.home.to_string_lossy()])
            .args(params)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .unwrap()
            .wait_with_output()
            .unwrap();
        assert_eq!(output.status.success(), true);
        output
    }

    pub fn start(&self, stderr: std::path::PathBuf) -> std::process::Child {
        let stderr = std::fs::OpenOptions::new()
            .create(true)
            .truncate(true)
            .write(true)
            .open(stderr)
            .unwrap();

        std::process::Command::new(&self.bin)
            .args(["--home", &self.home.to_string_lossy()])
            .args(["start"])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            // .stderr(std::process::Stdio::null())
            .stderr(std::process::Stdio::from(stderr))
            .spawn()
            .unwrap()
    }

    pub fn await_transaction(&self, tx: &str) {
        for _ in 0..1000 {
            let output = std::process::Command::new(&self.bin)
                .args(["--home", &self.home.to_string_lossy()])
                .args(["query", "tx", tx])
                .stdin(std::process::Stdio::null())
                .stdout(std::process::Stdio::piped())
                .stderr(std::process::Stdio::piped())
                .spawn()
                .unwrap()
                .wait_with_output()
                .unwrap();

            if output.status.success() {
                let data: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
                let code = data["code"].as_u64().unwrap();
                let height = data["height"].as_str().unwrap();
                if height != "0" {
                    if code != 0 {
                        panic!("Error tx: {}", String::from_utf8_lossy(&output.stdout));
                    }
                    return;
                }
            } else {
                let err = String::from_utf8_lossy(&output.stderr);
                if !err.contains(&format!("tx ({}) not found", tx)) {
                    panic!("Cannot get transaction");
                }
            }

            std::thread::sleep(std::time::Duration::from_secs_f32(0.1f32));
        }

        panic!("Failed awaiting transaction");
    }

    pub fn init(&self, moniker: &str, chain_id: &str) -> String {
        let output = self.run(vec!["init", moniker, "--chain-id", chain_id]);
        let data: serde_json::Value = serde_json::from_slice(&output.stderr).unwrap();
        data["node_id"].as_str().unwrap().to_owned()
    }

    pub fn add_key(&self, key: &str) -> String {
        let input = match self.home.join("keyring-file/keyhash").exists() {
            true => format!("{}\n", self.password),
            false => format!("{}\n", self.password).repeat(2),
        };

        let output = self.run_with_input(vec!["keys", "add", key], &input);
        let data: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
        data["address"].as_str().unwrap().to_owned()
    }

    pub fn parse_address(&self, address: &str) -> Vec<String> {
        #[derive(Deserialize)]
        #[serde(untagged)]
        #[allow(dead_code)]
        enum ParseOutput {
            Bytes { formats: Vec<String> },
            Bech { human: String, bytes: String },
        }

        let output = self.run(vec!["keys", "parse", address, "--output", "json"]);
        let data: ParseOutput = serde_json::from_slice(&output.stdout).unwrap();

        match data {
            ParseOutput::Bytes { mut formats } => {
                formats.push(format!("0x{}", address));
                formats
            }
            ParseOutput::Bech { bytes, .. } => {
                let address = bytes;
                let output = self.run(vec!["keys", "parse", &address, "--output", "json"]);
                let data: ParseOutput = serde_json::from_slice(&output.stdout).unwrap();
                if let ParseOutput::Bytes { mut formats } = data {
                    formats.push(format!("0x{}", address));
                    formats
                } else {
                    unreachable!();
                }
            }
        }
    }

    pub fn create_validator(&self, key: &str, amount: &str) -> String {
        let valkey = {
            let output = self.run(vec!["tendermint", "show-validator"]);
            String::from_utf8(output.stdout).unwrap()
        };

        let output = self.run_with_input(
            vec![
                "tx",
                "staking",
                "create-validator",
                "--gas",
                "auto",
                "--from",
                key,
                "--amount",
                amount,
                "--pubkey",
                &valkey,
                "--commission-rate",
                "0.1",
                "--commission-max-rate",
                "0.2",
                "--commission-max-change-rate",
                "0.01",
                "--min-self-delegation",
                "1",
                "--keyring-backend",
                "file",
                "-y",
            ],
            &format!("{}\n", self.password),
        );

        let data: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
        let tx = data["txhash"].as_str().unwrap();

        self.await_transaction(tx);
        tx.to_owned()
    }

    pub fn set_delegate_keys(
        &self,
        key: &str,
        valoper: &str,
        orchestrator: &str,
        signer: &str,
        sign: &str,
    ) -> String {
        let output = self.run_with_input(
            vec![
                "tx",
                "gravity",
                "set-delegate-keys",
                "--gas",
                "auto",
                "--from",
                key,
                valoper,
                orchestrator,
                signer,
                sign,
                "-y",
            ],
            &format!("{}\n", self.password),
        );

        let data: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
        let tx = data["txhash"].as_str().unwrap();

        self.await_transaction(tx);
        tx.to_owned()
    }
}

pub struct Gorc {
    pub bin: std::path::PathBuf,
    pub home: std::path::PathBuf,
}

pub enum GorcKeyType {
    Cosmos,
    Eth,
}

impl Gorc {
    pub fn run(&self, params: Vec<&str>) -> std::process::Output {
        let output = std::process::Command::new(&self.bin)
            .args(["-c", &self.home.join("config.toml").to_string_lossy()])
            .args(params)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .unwrap()
            .wait_with_output()
            .unwrap();
        assert_eq!(output.status.success(), true);
        output
    }

    pub fn add_key(&self, key_type: GorcKeyType, key: &str) -> String {
        let key_type = match key_type {
            GorcKeyType::Cosmos => "cosmos",
            GorcKeyType::Eth => "eth",
        };
        let output = self.run(vec!["keys", key_type, "add", key]);
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        stdout
            .rsplit(|b: char| b.is_whitespace())
            .next()
            .unwrap()
            .to_owned()
    }

    pub fn sign_delegate_keys(&self, signer: &str, valoper: &str) -> String {
        let output = self.run(vec!["sign-delegate-keys", "--args", signer, valoper]);
        String::from_utf8_lossy(&output.stdout).trim().to_owned()
    }
}

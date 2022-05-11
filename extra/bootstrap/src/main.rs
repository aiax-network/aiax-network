use colored::Colorize;

mod config;
mod genesis;
mod state;
mod utils;
mod wrappers;

use state::*;
use utils::file_replace;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let o_ok = "[OK]".green();
    let o_skip = "[SKIP]".yellow();
    colored::control::set_override(true);

    let bin_dir = std::path::Path::new("/aiax/bin");
    let data_dir = std::path::Path::new("/aiax/data");
    let assets_dir = std::path::Path::new("/aiax/bootstrap/assets");

    let mut state = StateFile::new(data_dir.join("bootstrap.state"));
    let config = config::Config::read(&assets_dir.join("config/testnet.yaml"));
    let genesis = genesis::Genesis::read(&assets_dir.join("genesis/testnet.json"));

    let keypass = std::env::var("KEYRING_PASS").expect("Provide keyring password in KEYRING_PASS");

    let aiaxd = wrappers::Aiaxd {
        bin: bin_dir.join("aiaxd"),
        home: data_dir.join("aiaxd"),
        password: keypass,
    };

    let gorc = wrappers::Gorc {
        bin: bin_dir.join("gorc"),
        home: data_dir.join("gorc"),
    };

    if state.1.stage == Stage::Empty {
        fs_extra::dir::create_all(data_dir.join("data"), true).unwrap();

        fs_extra::dir::copy(
            assets_dir.join("data"),
            data_dir,
            &fs_extra::dir::CopyOptions {
                content_only: true,
                ..Default::default()
            },
        )
        .unwrap();

        file_replace(
            &data_dir.join("gorc/config.toml"),
            "^$^$GRAVITY_ADDRESS^$^$",
            &config.gravity_contract,
        );

        file_replace(
            &data_dir.join("aiaxd/config/config.toml"),
            "^$^$PERSISTENT_PEERS^$^$",
            &config.persistent_peers.join(","),
        );

        file_replace(
            &data_dir.join("aiaxd/config/client.toml"),
            "^$^$CHAIN_ID^$^$",
            &genesis.chain_id(),
        );

        println!("{} Create config files", o_ok);

        state.1.stage = Stage::ConfigCreated;
        state.save();
    } else {
        println!("{} Create config files", o_skip);
    }

    if state.1.stage == Stage::ConfigCreated {
        if aiaxd.home.join("node/genesis.json").exists() {
            std::fs::remove_file(&aiaxd.home.join("node/genesis.json")).unwrap();
        }

        state.1.node_id = Some(aiaxd.init("localnode", &genesis.chain_id()));

        println!("{} Initialize node", o_ok);

        state.1.stage = Stage::NodeInitialized;
        state.save();
    } else {
        println!("{} Initialize node", o_skip);
    }

    {
        println!("NodeId is {}", state.1.node_id.as_ref().unwrap());
    }

    if state.1.stage == Stage::NodeInitialized {
        genesis.write(&aiaxd.home.join("node/genesis.json"));

        println!("{} Update genesis file", o_ok);

        state.1.stage = Stage::GenesisWritten;
        state.save();
    } else {
        println!("{} Update genesis file", o_skip);
    }

    if state.1.stage == Stage::GenesisWritten {
        if aiaxd.home.join("keyring-file").exists() {
            std::fs::remove_dir_all(&aiaxd.home.join("keyring-file")).unwrap();
        }
        if gorc.home.join("keystore").exists() {
            std::fs::remove_dir_all(&gorc.home.join("keystore")).unwrap();
        }

        state.1.validator = Some(aiaxd.add_key("validator"));
        state.1.orchestrator = Some(gorc.add_key(wrappers::GorcKeyType::Cosmos, "orchestrator"));
        state.1.signer = Some(gorc.add_key(wrappers::GorcKeyType::Eth, "signer"));

        println!("{} Create keys", o_ok);

        state.1.stage = Stage::KeysCreated;
        state.save();
    } else {
        println!("{} Create keys", o_skip);
    }

    {
        let val = aiaxd.parse_address(state.1.validator.as_ref().unwrap());
        let orch = aiaxd.parse_address(state.1.orchestrator.as_ref().unwrap());
        println!(
            "Validator is {} / {}",
            val.iter().find(|s| s.starts_with("0x")).unwrap(),
            val.iter().find(|s| s.starts_with("aiax1")).unwrap(),
        );
        println!(
            "Orchestrator is {} / {}",
            orch.iter().find(|s| s.starts_with("0x")).unwrap(),
            orch.iter().find(|s| s.starts_with("aiax1")).unwrap(),
        );
        println!("Signer is {}", state.1.signer.as_ref().unwrap());
    }

    let mut node = aiaxd.start();
    let transport = web3::transports::Http::new("http://127.0.0.1:8545/").unwrap();
    let web3 = web3::Web3::new(transport);

    {
        println!("Syncing blockchain...");

        while node.try_wait().unwrap() == None {
            if let Ok(res) = web3.eth().syncing().await {
                if res == web3::types::SyncState::NotSyncing {
                    break;
                }
            }
            std::thread::sleep(std::time::Duration::from_secs_f32(0.1f32));
        }

        println!("Synced");
    }

    if state.1.stage == Stage::KeysCreated {
        let val = {
            let vals = aiaxd.parse_address(state.1.validator.as_ref().unwrap());
            vals.into_iter().find(|s| s.starts_with("0x")).unwrap()
        };

        println!("Awaiting balance change for validator");

        let amount = {
            let mut balance = 0;
            while balance == 0 {
                balance = web3
                    .eth()
                    .balance(val.parse().unwrap(), None)
                    .await
                    .unwrap()
                    .as_u128();
            }
            format!("{}aaiax", balance)
        };

        println!("Creating validator with {}", amount);

        aiaxd.create_validator("validator", &amount);

        println!("{} Create staking validator", o_ok);

        state.1.stage = Stage::ValidatorCreated;
        state.save();
    } else {
        println!("{} Create staking validator", o_skip);
    }

    if state.1.stage == Stage::ValidatorCreated {
        let valoper = {
            let vals = aiaxd.parse_address(state.1.validator.as_ref().unwrap());
            vals.into_iter()
                .find(|s| s.starts_with("aiaxvaloper1"))
                .unwrap()
        };

        let sign = gorc.sign_delegate_keys("signer", &valoper);

        println!("Setting gravity delegate keys");

        aiaxd.set_delegate_keys(
            "validator",
            &valoper,
            state.1.orchestrator.as_ref().unwrap(),
            state.1.signer.as_ref().unwrap(),
            &sign,
        );

        println!("{} Set gravity delegate keys", o_ok);

        state.1.stage = Stage::GravityKeysDelegated;
        state.save();
    } else {
        println!("{} Set gravity delegate keys", o_skip);
    }

    node.kill().ok();
    node.wait().ok();

    Ok(())
}

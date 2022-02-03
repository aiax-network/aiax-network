# Aiax Network


## Testnet init guide
0. Run geth `sudo docker-compose up eth`
1. Generate gravityId (random 30 bytes):
    `require('crypto').randomBytes(15).toString('hex')`
    `9217099a5399dedd106b9fcc51a975`
2. Deploy ERC20AiaxToken contract
3. Go through `Testnet creating` section, configuring `genesis.json`:
    - Set `/app_state/gravity/params/gravity_id` to gravityId
    - Set `/app_state/aiax/params/aiax_token_contract_address` to ERC20AiaxToken contract address
4. Run aiaxd `sudo docker-compose up aiaxd`
5. Deploy Gravity contract and configure `gorc/config.toml`
    - Set `/gravity/contract` to Gravity contract address
6. Send some ETH to gorc `signer` wallet
7. Run gorc `sudo docker-compose up gorc`


## Contracts deployment
```bash
./node_modules/.bin/hardhat compile

npm run aiax -- contract deploy -c ERC20AiaxToken --eth-privkey [privkey]
# 0xdDdBB41e63032249B6797Ee064A319ec77E12B59

npm run aiax -- contract deploy -c Gravity --eth-privkey [privkey]
# 0x9a5c87a00Faaf954ece3370053b95c2e3F21CD0E
```


## Testnet joining
```bash
cp -r data/basic data/local

alias aiaxd="sudo docker-compose run -u $UID --rm aiaxd ./aiaxd --home /aiax/data"
alias gorc="sudo docker-compose run -u $UID --rm gorc ./gorc -c /aiax/data/config.toml"

aiaxd config keyring-backend "test"
aiaxd config chain-id "aiax_1630299616-1"
aiaxd config output "json"

# Init node and save node_id
aiaxd init "localnet" --chain-id "aiax_1630299616-1"
# 7a74bf4f8e4218cf7f1c188cfbad342f76a0da2a

# Edit app.toml (app.toml api.enabled, api.swagger, ethereum.rpc) (config.toml: rpc.laddr)
# Overwrite genesis.json with provided one

# Generate validator key
aiaxd keys add "validator"
# Get it address with Bech32 'val' prefix
aiaxd keys show "validator" --bech val
# aiaxvaloper1wfuuxa7vg2gzssw7a2qswmt3kxrdcdfjhguyh8

# Generate orchestrator key
gorc keys cosmos add "orchestrator"
# aiax1es0dmkv8f0tj92zeu79vhnz5avzwprye5vdldd

# Generate signer key
gorc keys eth add "signer"
# 0x01230bF0dDc71BAc63BFb9Eb435E0F4B1867B1e6
```


## Testnet creating
```bash
cp -r data/basic data/local

alias aiaxd="sudo docker-compose run -u $UID --rm aiaxd ./aiaxd --home /aiax/data"
alias gorc="sudo docker-compose run -u $UID --rm gorc ./gorc -c /aiax/data/config.toml"

aiaxd config keyring-backend "test"
aiaxd config chain-id "aiax_1630299616-1"
aiaxd config output "json"

# Init node and save node_id
aiaxd init "localnet" --chain-id "aiax_1630299616-1"
# 7a74bf4f8e4218cf7f1c188cfbad342f76a0da2a

# Edit app.toml (app.toml api.enabled, api.swagger, ethereum.rpc) (config.toml: rpc.laddr)
# Edit genesis.json

# Generate validator key
aiaxd keys add "validator"
# Get it address with Bech32 'val' prefix
aiaxd keys show "validator" --bech val
# aiaxvaloper1wfuuxa7vg2gzssw7a2qswmt3kxrdcdfjhguyh8

# Generate orchestrator key
gorc keys cosmos add "orchestrator"
# aiax1es0dmkv8f0tj92zeu79vhnz5avzwprye5vdldd

# Generate signer key
gorc keys eth add "signer"
# 0x01230bF0dDc71BAc63BFb9Eb435E0F4B1867B1e6

# Add genesis accounts
aiaxd add-genesis-account "validator" "1000000000000000000000aaiax"
aiaxd add-genesis-account "aiax1es0dmkv8f0tj92zeu79vhnz5avzwprye5vdldd" "1000000000000000000000aaiax"

gorc sign-delegate-keys --args "signer" "aiaxvaloper1wfuuxa7vg2gzssw7a2qswmt3kxrdcdfjhguyh8" 0
# 0xdab56c77abc7751f68a2979ba9bcee0f1100183fb19fba1cea7de817035ca4214ee4a4e095bc1cbb7fccc4e419f0d41ca5f9371c4b46fd076d514746a11049541b

aiaxd gentx "validator" "1000000000000000000000aaiax" \
    "0x01230bF0dDc71BAc63BFb9Eb435E0F4B1867B1e6" "aiax1es0dmkv8f0tj92zeu79vhnz5avzwprye5vdldd" \
    "0xdab56c77abc7751f68a2979ba9bcee0f1100183fb19fba1cea7de817035ca4214ee4a4e095bc1cbb7fccc4e419f0d41ca5f9371c4b46fd076d514746a11049541b" \
    --chain-id "aiax_1630299616-1" \
    --website "https://aiax.network" \
    --ip "127.0.0.1" \
    --node-id "fcf317bce1284553c8c5acb92e0bbdf6b0043e09" \
    --note "fcf317bce1284553c8c5acb92e0bbdf6b0043e09@127.0.0.1:26656"

aiaxd collect-gentxs --keyring-backend "test"
```
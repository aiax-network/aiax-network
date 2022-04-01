# Prerequisites
1. Install git, docker and docker-compose
2. Prepare repo and build docker images:
    ```sh
    git clone https://github.com/aiax-network/aiax-network.git
    cd aiax-network/extra
    git submodule update --init --recursive
    sudo docker build -f Dockerfile.aiaxd --rm -t aiaxd .
    sudo docker build -f Dockerfile.gorc --rm -t gorc .
    ```
3. Prepare docker networks:
    ```sh
    sudo docker network create aiax_testnet_reproxy
    sudo docker network create aiax_testnet_aiaxd
    sudo docker network create aiax_testnet_gorc
    ```
4. Create some `chain_id`, for example:
    ```sh
    export chain_id=aiax_612938472-1
    ```
5. Some useful aliases for node setup:
    ```sh
    # Commands for easy running command in a new container (useful for configuration)
    alias aiaxd="sudo docker-compose run -u $UID --rm aiaxd ./aiaxd --home /aiax/data"
    alias gorc="sudo docker-compose run -u $UID --rm gorc ./gorc -c /aiax/data/config.toml"
    # Commands for running commands in online containers (useful for transactions)
    alias in_aiaxd="sudo docker-compose exec aiaxd ./aiaxd --home /aiax/data"
    alias in_gorc="sudo docker-compose exec gorc ./gorc -c /aiax/data/config.toml"
    ```


# Setup ethereum node (`./deploy/eth`)
### `docker-compose.yml`
```yaml
version: "3"

services:
  eth:
    image: ethereum/client-go:stable
    command: --goerli --http --http.addr=0.0.0.0 --http.vhosts=* --syncmode light
    restart: always # ethereum does not start automatically in 'unless-stopped' mode
    networks:
      - aiax_testnet_aiaxd
      - aiax_testnet_gorc
    volumes:
      - ./data:/root/.ethereum

networks:
  aiax_testnet_aiaxd:
    external: true
  aiax_testnet_gorc:
    external: true
```
```sh
sudo docker-compose up -d
```


# Setup ssl reverse proxy (`./deploy/reproxy`)
### `docker-compose.yml`
```yaml
version: "3"

services:
  reproxy:
    image: umputun/reproxy
    restart: unless-stopped
    ports:
      - 80:8080
      - 443:8443
    networks:
      - aiax_testnet_reproxy
    volumes:
      - ./data/acme:/var/acme
    environment:
      - STATIC_ENABLED=True
      - STATIC_RULES=test-rpc.aiax.network,^/(.*),http://aiaxd:8545/$$1
      - SSL_TYPE=auto
      - SSL_ACME_LOCATION=/var/acme
      - TIMEOUT_RESP_HEADER=30

networks:
  aiax_testnet_reproxy:
    external: true
```
```sh
sudo docker-compose up -d
```


# Setup node (`./deploy/node$N`)
### `docker-compose.yml`
```yaml
version: "3"

services:
  gorc:
    image: gorc
    command: ./gorc -c /aiax/data/config.toml orchestrator start --cosmos-key=orchestrator --ethereum-key=signer
    volumes:
      - ./data/gorc:/aiax/data
    restart: unless-stopped
    networks:
      - default
      - aiax_testnet_gorc

  aiaxd:
    image: aiaxd
    command: ./aiaxd --home /aiax/data start
    volumes:
      - ./data/aiaxd:/aiax/data
    restart: unless-stopped
    networks:
      - default
      - aiax_testnet_aiaxd
      - aiax_testnet_reproxy

networks:
  default:
  aiax_testnet_reproxy:
    external: true
  aiax_testnet_aiaxd:
    external: true
  aiax_testnet_gorc:
    external: true
```


## Setup initial node (`./deploy/node1`)
```sh
# Copy configs
cp -r $REPO/data/basic ./data
aiaxd config chain-id "$chain_id"

# Initialize node
aiaxd init localnode --chain-id "$chain_id"
export node_id=3c56ac2379a9a3a4dd560f48bc01926aa6eb3bf8

# Edit `data/aiaxd/node/genesis.json` (check `src/testnode/wrappers/aiaxd.ts:452`)

# Create validator key
aiaxd keys add validator && aiaxd keys show validator --bech val
export validator=aiax1s6ulzlgfghcs3qddlqvg26u0upaecvmu8y2ezv
export validator_valoper=aiaxvaloper1s6ulzlgfghcs3qddlqvg26u0upaecvmu82mx8l

# Create faucet key
aiaxd keys add faucet && aiaxd keys unsafe-export-eth-key faucet --keyring-backend test
export faucet=aiax19z2q7jk44nmza2drgd4a8gla9tznwzczaanjkt
export faucet_key=6A8EF19...

# Create orchestrator key
gorc keys cosmos add orchestrator
export orchestrator=aiax183wcp7a2c4as8yquzysnj3n9fumrlctn3y0873

# Create signer key
gorc keys eth add signer
export signer=0x2890a823E0Af6DC68eFaCa0af065e3d8100Fcb04

# Deposit some ethereum to signer

# Mint some aaiax in genesis
aiaxd add-genesis-account "$validator" 1000000000000000000000aaiax
aiaxd add-genesis-account "$orchestrator" 1000000000000000000000aaiax
aiaxd add-genesis-account "$faucet" 1000000000000000000000000000000000000000000aaiax

# Sign delegate keys
gorc sign-delegate-keys --args signer "$validator_valoper" 0
export eth_sign=0x4a62d438dc61c67cf69b5f4721dc7f1a0bb4217e31ad25fdce8069bc18cd8251726ade67cc5e4db5681e87cdc94893d1f3b44271aaf6b9ed5a4a1c45c1680a311b

# Create genesis transactions
aiaxd gentx "validator" "1000000000000000000000aaiax" \
    "$signer" "$orchestrator" "$eth_sign" \
    --chain-id "$chain_id" \
    --website "https://aiax.network" \
    --ip "127.0.0.1" \
    --node-id "$node_id" \
    --note "$node_id@127.0.0.1:26656"

# Include transaction in genesis json
aiaxd collect-gentxs

# Run aiaxd node
sudo docker-compose up -d aiaxd

# Check that node is running (detach with CTRL+C)
sudo docker-compose logs -f aiaxd

# Find aiaxd ip address
sudo docker inspect -f '{{range.NetworkSettings.Networks}}{{println .IPAddress}}{{end}}' node1_aiaxd_1
export cosmos_ip=172.22.0.3

# Find eth ip address
sudo docker inspect -f '{{range.NetworkSettings.Networks}}{{println .IPAddress}}{{end}}' eth_eth_1
export eth_ip=172.22.0.2

# Deploy gravity into ethereum (from repo)
npm run dev:aiax -- contract deploy -c Gravity --eth-privkey $privkey --cosmos-node http://$cosmos_ip:26657 --eth-node http://$eth_ip:8545
export gravity=0x079Cc388C0f32A98eA8eD43306f17E3992B20ECE
export token=0x8E460bC0F0176A49f86f841B0D4A35b40733ad26

# Edit `data/gorc/config.toml` (set gravity address)

# Run gorc orchestrator
sudo docker-compose up -d gorc
```


## Setup secondary node (`./deploy/nodeN`)
```sh
# Copy configs
cp -r $REPO/data/basic ./data
aiaxd config chain-id "$chain_id"

# Initialize node
aiaxd init localnode --chain-id "$chain_id"
export node_id=0e0a54338b48f18d7663d4b64f5e57cd018d5d85

# Edit data/aiaxd/config/config.toml
# [p2p]
# persistent_peers = [$initial_node_id@node1_aiaxd_1:26656]

# Copy genesis from initial node
cp ../node1/data/aiaxd/node/genesis.json ./data/aiaxd/node/genesis.json

# Create validator key
aiaxd keys add validator && aiaxd keys show validator --bech val
export validator=aiax1yau06dp0z345zdyyzczfjmmuluy7c4gf5yefjf
export validator_valoper=aiaxvaloper1yau06dp0z345zdyyzczfjmmuluy7c4gf52gkh6

# Create orchestrator key
gorc keys cosmos add orchestrator
export orchestrator=aiax17wgk2q3jqa5hc9kuextfjyluuj0hvxsneteghc

# Create signer key
gorc keys eth add signer
export signer=0x72f3d403FD03D4e409C57fF317C950248398036f

# Deposit some ethereum to signer
# Deposit 1000000000000000000000aaiax to validator and orchestrator
sudo docker exec node1_aiaxd_1 ./aiaxd --home /aiax/data tx bank send faucet "$validator" 1000000000000000000000aaiax -y
sudo docker exec node1_aiaxd_1 ./aiaxd --home /aiax/data tx bank send faucet "$orchestrator" 1000000000000000000000aaiax -y

# Run aiaxd node
sudo docker-compose up -d aiaxd

# Check that node is running (detach with CTRL+C)
sudo docker-compose logs -f aiaxd

# Show validator key
in_aiaxd tendermint show-validator
export val_key='{"@type":"/cosmos.crypto.ed25519.PubKey","key":"yPIT..."}'

# Register staking validator
in_aiaxd tx staking create-validator \
    --from validator --amount 1000000000000000000000aaiax --pubkey "$val_key" \
    --commission-rate 0.10 --commission-max-rate 0.20 \
    --commission-max-change-rate 0.01 --min-self-delegation 1 \
    -y

# Sign delegate keys
gorc sign-delegate-keys --args signer "$validator_valoper"
export eth_sign=0xe021a4c9c7b3841c6967e090cb909bfe59f09139e4144372800e5110a486b7e8311db42bbabde220474448bbc354430760a901df315cfe9fa1ac51a6b1408a031b

# Set gravity delegate keys
in_aiaxd tx gravity set-delegate-keys --from validator \
    "$validator_valoper" "$orchestrator" "$signer" "$eth_sign" \
    -y

# Edit `data/gorc/config.toml` (set gravity address)

# Run gorc orchestrator
sudo docker-compose up -d gorc
```
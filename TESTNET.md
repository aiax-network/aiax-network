# Prerequisites
1. Install git, docker and docker-compose
2. Prepare repo and build docker images:
    ```sh
    git clone https://github.com/aiax-network/aiax-network.git
    cd aiax-network/extra
    git submodule update --init --recursive
    sudo docker build -f Dockerfile.aiaxd --rm -t aiax-aiaxd .
    sudo docker build -f Dockerfile.gorc --rm -t aiax-gorc .
    ```
3. Prepare docker networks:
    ```sh
    sudo docker network create aiax_testnet_reproxy
    sudo docker network create aiax_testnet_aiaxd
    sudo docker network create aiax_testnet_gorc
    ```
4. Create some `chain_id`, for example:
    ```sh
    export chain_id=aiax_789621341-1
    ```
5. Some useful aliases for node setup:
    ```sh
    # Commands for easy running command in a new container (useful for configuration)
    alias aiaxd="sudo docker-compose run --rm aiaxd"
    alias gorc="sudo docker-compose run --rm gorc"
    # Commands for running commands in online containers (useful for transactions)
    alias in_aiaxd="sudo docker-compose exec aiaxd /aiax/bin/aiaxd --home /aiax/data/aiaxd"
    alias in_gorc="sudo docker-compose exec gorc /aiax/bin/gorc -c /aiax/data/gorc/config.toml"
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
    image: aiax-gorc
    command: orchestrator start --cosmos-key=orchestrator --ethereum-key=signer
    volumes:
      - ./data/gorc:/aiax/data/gorc
    restart: unless-stopped
    networks:
      - default
      - aiax_testnet_gorc

  aiaxd:
    image: aiax-aiaxd
    command: start
    volumes:
      - ./data/aiaxd:/aiax/data/aiaxd
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
cp -r $REPO/extra/bootstrap/assets/data ./data
aiaxd config chain-id "$chain_id"

# Initialize node
aiaxd init localnode --chain-id "$chain_id"
export node_id=fbff652da5259ec704d675731c275c7dff4d667f

# Edit `data/aiaxd/node/genesis.json` (check `src/testnode/wrappers/aiaxd.ts:452`)

# Create validator key
aiaxd keys add validator && aiaxd keys show validator --bech val
export validator=aiax1depdhlc633rghk3r59pyxc5kv3h4wdulam6ps6
export validator_valoper=aiaxvaloper1depdhlc633rghk3r59pyxc5kv3h4wdula4t74f

# Create faucet key
aiaxd keys add faucet && aiaxd keys unsafe-export-eth-key faucet --keyring-backend file
export faucet=aiax1u3654yj44eprt0fcwl2eh0uesphsdm7z5dmvfw
export faucet_key=E261EFC...

# Create orchestrator key
gorc keys cosmos add orchestrator
export orchestrator=aiax1hchyr2zsrz359pqfp4x3wfy3vcl9enm8lj5vch

# Create signer key
gorc keys eth add signer
export signer=0x2818d5A1e7A14DC6bf2d0eB8a14f560063A7378b

# Deposit some ethereum to signer

# Mint some aaiax in genesis
# Mint 1000000000000000000000aaiax (1000 AXX) to validator and orchestrator
# Here validator needs 1000 AXX to pass the threshold and orchestrator needs coins to just create orchestrating transactions
aiaxd add-genesis-account "$validator" 1000000000000000000000aaiax
aiaxd add-genesis-account "$orchestrator" 1000000000000000000000aaiax
# Mint a lot of aaiax to faucet to have some coins in testnet for testing
aiaxd add-genesis-account "$faucet" 1000000000000000000000000000000000000000000aaiax

# Sign delegate keys
gorc sign-delegate-keys --args signer "$validator_valoper" 0
export eth_sign=0x238dad7dbe98ac598d6e50d172aca251530c394e9da31549602bafb037ef6dc27eb244af4774a1400a028602103ba5e33bdc715f99d706ff56dfcaa3c3eb8e4e1c

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
export gravity=0x6904DefD3a904399f6DBf863c1a773AFBD9D18FE
export token=0x1325CA0C6547Fd9488fF2318AA738857f9CaF891

# Edit `data/gorc/config.toml` (set gravity address)

# Run gorc orchestrator
sudo docker-compose up -d gorc

# Check that orchestrator is running (detach with CTRL+C)
sudo docker-compose logs -f gorc
```


## Setup secondary node (`./deploy/nodeN`)
```sh
# Copy configs
cp -r $REPO/extra/bootstrap/assets/data ./data
aiaxd config chain-id "$chain_id"

# Initialize node
aiaxd init localnode --chain-id "$chain_id"
export node_id=7c409a7d992bd2fd37b6e6b47e9c170b97f76fd3

# Edit data/gorc/config.toml
# [gravity]
# contract = '$gravity'

# Edit data/aiaxd/config/config.toml
# [p2p]
# persistent_peers = "$initial_node_id@node1_aiaxd_1:26656"

# Copy genesis from initial node
cp ../node1/data/aiaxd/node/genesis.json ./data/aiaxd/node/genesis.json

# Create validator key
aiaxd keys add validator && aiaxd keys show validator --bech val
export validator=aiax1rdl727jc0n92suzdn5cl8sjrjw9hadd948twgr
export validator_valoper=aiaxvaloper1rdl727jc0n92suzdn5cl8sjrjw9hadd94f63ds

# Create orchestrator key
gorc keys cosmos add orchestrator
export orchestrator=aiax15mvr82jpgf7je7dzh97q2jcxky5ks6llnj46wf

# Create signer key
gorc keys eth add signer
export signer=0x14282eF6Fe0C4BcdDd60881EAe6692B9c8A7E51C

# Deposit some ethereum to signer
# Deposit 1000000000000000000000aaiax (1000 AXX) to validator and orchestrator
# Here validator needs 1000 AXX to pass the threshold and orchestrator needs coins to just create orchestrating transactions
(cd ../node1 && in_aiaxd tx bank send faucet "$validator" 1000000000000000000000aaiax -y)
(cd ../node1 && in_aiaxd tx bank send faucet "$orchestrator" 1000000000000000000000aaiax -y)

# Run aiaxd node
sudo docker-compose up -d aiaxd

# Check that node is running (detach with CTRL+C)
sudo docker-compose logs -f aiaxd

# Show validator key
in_aiaxd tendermint show-validator
export val_key='{"@type":"/cosmos.crypto.ed25519.PubKey","key":"GVZc..."}'

# Register staking validator
in_aiaxd tx staking create-validator \
    --from validator --amount 1000000000000000000000aaiax --pubkey "$val_key" \
    --commission-rate 0.10 --commission-max-rate 0.20 \
    --commission-max-change-rate 0.01 --min-self-delegation 1 \
    -y --keyring-backend file

# Sign delegate keys
gorc sign-delegate-keys --args signer "$validator_valoper"
export eth_sign=0x68202fa2d6b14938f53ac0debe42b87beb8e8fda402a581539ade4cc99bf571e350928464e59c4aebe5eb02c6eb4defa03b4218c0e256fcd914cc6014fd0f9a31b

# Set gravity delegate keys
in_aiaxd tx gravity set-delegate-keys --from validator \
    "$validator_valoper" "$orchestrator" "$signer" "$eth_sign" \
    -y

# Run gorc orchestrator
sudo docker-compose up -d gorc

# Check that orchestrator is running (detach with CTRL+C)
sudo docker-compose logs -f gorc
```
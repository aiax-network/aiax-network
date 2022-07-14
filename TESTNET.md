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
    export chain_id=aiax_12344123324-1
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
export node_id=723125b1aa39d592e24cd9841ea242f032d4c66c

# Edit `data/aiaxd/node/genesis.json` (check `src/testnode/wrappers/aiaxd.ts:452`)

# Create validator key
aiaxd keys add validator && aiaxd keys show validator --bech val
export validator=aiax156up7vq8f8400vja3c5wuttl886209aamgg6rr
export validator_valoper=aiaxvaloper156up7vq8f8400vja3c5wuttl886209aamxe9xs

# Create faucet key
aiaxd keys add faucet && aiaxd keys unsafe-export-eth-key faucet --keyring-backend file
export faucet=aiax1cgjweprkssw3tf3guq2u9dny7jgpejfxy255mx
export faucet_key=A63FE1585261F07C417F48E725C01748570B7A04AF106A3C539585C10411C81D

# Create orchestrator key
gorc keys cosmos add orchestrator
export orchestrator=aiax1dy27k06482v6ezvajyusc2w6ua4av8qe5vnefw

# Create signer key
gorc keys eth add signer
export signer=0x455212466E1Cca4F3a95875d51B3496435E19cb3

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
export eth_sign=0xa6f5f1ffd18e40e7c8625d68ff752d5f65695aca17e7efe740a026f4cfe130360b711c41b80d83378b379b83dd8e316954319aed93c28ba2d675ba4517373f271b

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
export gravity=0xeD383B6fc43caF995258c88783b2542F7C9A2Dd5
export token=0x64A4BaEEd96440ffdB402b4b242D4388873981D3

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
export node_id=905b6504a8608a77c5d4a24064d9ea6bee44c2d0

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
export validator=aiax1wwmg7z6dr88y8dp3v2l5pvgpva2antql07df5a
export validator_valoper=aiaxvaloper1wwmg7z6dr88y8dp3v2l5pvgpva2antql0suk3w

# Create orchestrator key
gorc keys cosmos add orchestrator
export orchestrator=aiax194d4vzh4rcc5xzemp6evm90guvrvthaaqlzjkn

# Create signer key
gorc keys eth add signer
export signer=0x3C60DfE069308b357e0Afe7564b1249e762d8Bd1

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
export val_key='{"@type":"/cosmos.crypto.ed25519.PubKey","key":"MIjg"}'

# Register staking validator
in_aiaxd tx staking create-validator \
    --from validator --amount 1000000000000000000000aaiax --pubkey "$val_key" \
    --commission-rate 0.10 --commission-max-rate 0.20 \
    --commission-max-change-rate 0.01 --min-self-delegation 1 \
    -y --keyring-backend file

# Sign delegate keys
gorc sign-delegate-keys --args signer "$validator_valoper"
export eth_sign=0x73d8465bc4ac3e686421132710444ea2085f1c45781313d5182058ea6ee738052c7e150552ab9df63494df49e8c4bc13499d2f6fae6215eee9b58e51b88dbd211c

# Set gravity delegate keys
in_aiaxd tx gravity set-delegate-keys --from validator \
    "$validator_valoper" "$orchestrator" "$signer" "$eth_sign" \
    -y

# Run gorc orchestrator
sudo docker-compose up -d gorc

# Check that orchestrator is running (detach with CTRL+C)
sudo docker-compose logs -f gorc
```
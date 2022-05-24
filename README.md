# Aiax Network

## Joining testnet

1. Install [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
2. Clone repository:
    ```bash
    git clone --recurse-submodules -b deploy-testnet https://github.com/aiax-network/aiax-network.git
    cd aiax-network
    ```
3. Build docker images:
    ```bash
    cd extra
    sudo docker build -f Dockerfile.aiaxd --rm -t aiax-aiaxd .
    sudo docker build -f Dockerfile.gorc --rm -t aiax-gorc .
    sudo docker build -f Dockerfile.bootstrap --rm -t aiax-bootstrap .
    ```
4. Create an empty directory and run inside (**note the KEYRING_PASS env, it is password for aiaxd keyring**):
    ```bash
    export KEYRING_PASS=securepass
    sudo docker run -v "$(pwd)/data:/aiax/data" -e "KEYRING_PASS=$KEYRING_PASS" --add-host aiaxd:127.0.0.1 -it aiax-bootstrap
    # Sync progress can be monitored in ./data/aiaxd.stderr.log
    ```
5. You have to deposit 1000 AXX to a validator (in aiax chain) to pass the previous step. Also deposit some AXX to orchestrator (in aiax chain) and some ETH to signer (in eth chain) to make bridge transactions
6. Create `docker-compose.yml` and run it:
    ```yaml
    version: "3.8"
    services:
        gorc:
            image: aiax-gorc
            command: orchestrator start --cosmos-key=orchestrator --ethereum-key=signer
            volumes:
            - ./data/gorc:/aiax/data/gorc
            restart: on-failure

        aiaxd:
            image: aiax-aiaxd
            command: start
            volumes:
            - ./data/aiaxd:/aiax/data/aiaxd
            restart: on-failure

        eth:
            image: ethereum/client-go:stable
            command: --goerli --http --http.addr=0.0.0.0 --http.vhosts=* --syncmode light
            volumes:
            - ./data/eth:/root/.ethereum
            restart: on-failure
    ```
    `sudo docker-compose up -d`
7. Now you can monitor your node using `sudo docker-compose logs -f`
    - Note that gorc will try to restart unless it will find some ETH on signer and AXX on orchestrator (allow some time to sync eth light node)

import * as fs from 'fs';
import * as path from 'path';
import toml from '@ltd/j-toml';
import { processRun, processRunGetOutput, ProcessWrapper } from "../../proc";
import { randomBytes } from 'crypto';
import { getJsonPath, setJsonPath } from '../../utils';
import { tomlApply } from '../../toml';

type AiaxdWrapperOpts = {
  binary: string,
  directory: string,
  peers: Array<string>,
  ports: {
    eth: number,
  },
  listen: {
    api: number,
    grpc: number,
    json_rpc: number,
    json_rpc_ws: number,
    proxy_app: number,
    rpc: number,
    pprof: number,
    p2p: number,
  }
};

const chain_id = `aiax_${Math.floor(new Date().getTime() / 1000)}-1`;

export class AiaxdWrapper {
  private proc?: ProcessWrapper;
  private _node_id?: string;
  readonly opts: AiaxdWrapperOpts;
  private readonly keys: Map<string, string>;
  private readonly val_keys: Map<string, string>;

  constructor(opts: AiaxdWrapperOpts) {
    this.proc = null;
    this.opts = opts;
    this.keys = new Map();
    this.val_keys = new Map();
    fs.mkdirSync(this.opts.directory, { recursive: true });
    fs.mkdirSync(path.resolve(this.opts.directory, 'node'), { recursive: true });
    this.initConfig();
  }

  get node_id(): string { return this._node_id; }

  get genesis(): string { return path.resolve(this.opts.directory, 'node', 'genesis.json'); }

  async init(): Promise<string> {
    let output = await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "init",
      "localnet",
      "--chain-id",
      chain_id,
    ], {
      cwd: this.opts.directory,
    });

    await this.patchConfig();

    let data = JSON.parse(output);
    this._node_id = data.node_id
    return this.node_id;
  }

  initConfig() {
    let dir = path.resolve(this.opts.directory, "config");
    fs.mkdirSync(dir, { recursive: true });

    { // Ensure config/config.toml
      let data = toml.stringify({
        genesis_file: 'node/genesis.json',
        priv_validator_key_file: 'node/priv_validator_key.json',
        priv_validator_state_file: 'node/priv_validator_state.json',
        node_key_file: 'node/node_key.json',

        p2p: toml.Section({
          addr_book_file: 'node/addrbook.json',
        }),
      }, { newline: '\n' });

      fs.writeFileSync(path.resolve(dir, "config.toml"), data, { flag: 'w' });
    }
  }

  async patchConfig() {
    let dir = path.resolve(this.opts.directory, "config");
    fs.mkdirSync(dir, { recursive: true });

    { // Ensure config/client.toml
      let data = {
        'chain-id': chain_id,
        'keyring-backend': 'test',
        output: 'json',
        node: `tcp://127.0.0.1:${this.opts.listen.rpc}`,
      };

      let cfg = path.resolve(dir, "client.toml");
      await tomlApply(cfg, data);
    }

    { // Ensure config/app.toml
      let data = {
        api: toml.Section({
          enable: true,
          address: `tcp://127.0.0.1:${this.opts.listen.api}`,
        }),
        rosetta: toml.Section({
          enable: false,
        }),
        grpc: toml.Section({
          enable: true,
          address: `127.0.0.1:${this.opts.listen.grpc}`,
        }),
        'grpc-web': toml.Section({
          enable: false,
        }),
        'json-rpc': toml.Section({
          enable: true,
          address: `127.0.0.1:${this.opts.listen.json_rpc}`,
          'ws-address': `127.0.0.1:${this.opts.listen.json_rpc_ws}`,
        }),
        ethereum: toml.Section({
          rpc: `http://127.0.0.1:${this.opts.ports.eth}/`,
        }),
      };

      let cfg = path.resolve(dir, "app.toml");
      await tomlApply(cfg, data);
    }

    { // Ensure config/config.toml
      let data = {
        proxy_app: `tcp://127.0.0.1:${this.opts.listen.proxy_app}`,
        genesis_file: 'node/genesis.json',
        priv_validator_key_file: 'node/priv_validator_key.json',
        priv_validator_state_file: 'node/priv_validator_state.json',
        node_key_file: 'node/node_key.json',

        rpc: toml.Section({
          laddr: `tcp://0.0.0.0:${this.opts.listen.rpc}`,
          pprof_laddr: `127.0.0.1:${this.opts.listen.pprof}`,
        }),
        p2p: toml.Section({
          laddr: `tcp://127.0.0.1:${this.opts.listen.p2p}`,
          persistent_peers: this.opts.peers.join(','),
          addr_book_file: 'node/addrbook.json',
        }),
      };

      let cfg = path.resolve(dir, "config.toml");
      await tomlApply(cfg, data);
    }
  }

  async ensureKey(name: string): Promise<string> {
    if (this.keys.has(name)) {
      return this.keys.get(name);
    }

    let output = await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "keys",
      "add",
      name,
    ], {
      cwd: this.opts.directory,
    });

    let data = JSON.parse(output);
    this.keys.set(name, data.address);
    return data.address;
  }

  async ensureValKey(name: string): Promise<string> {
    if (this.val_keys.has(name)) {
      return this.val_keys.get(name);
    }

    await this.ensureKey(name);

    let output = await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "keys",
      "show",
      name,
      "--bech",
      "val",
    ], {
      cwd: this.opts.directory,
    });

    let data = JSON.parse(output);
    this.val_keys.set(name, data.address);
    return data.address;
  }

  async parseKey(value: string): Promise<Array<string>> {
    let output = await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "keys",
      "parse",
      value,
      "--output",
      "json",
    ], {
      cwd: this.opts.directory,
    });

    const data = JSON.parse(output);

    if (typeof data.bytes === 'string') {
      return ['0x' + data.bytes];
    } else if (Array.isArray(data.formats)) {
      return [...data.formats];
    } else {
      return Promise.reject('Unexpected response');
    }
  }

  async addGenesisAccount(address: string, amount: string): Promise<void> {
    await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "add-genesis-account",
      address,
      amount,
    ], {
      cwd: this.opts.directory,
    });
  }

  async sendTokens(key_name: string, dest_addr: string, amount: string): Promise<void> {
    let data = JSON.parse(await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "tx",
      "bank",
      "send",
      key_name,
      dest_addr,
      amount,
      "-y",
    ], {
      cwd: this.opts.directory,
    }));

    await this.awaitTransaction(data.txhash);

    return data.txhash;
  }

  async getBalances(address: string): Promise<any> {
    return JSON.parse(await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "query",
      "bank",
      "balances",
      address,
    ], {
      cwd: this.opts.directory,
    }));
  }

  async getErc20Mapping(eth_token_addr: string): Promise<string | null> {
    const data = JSON.parse(
      await processRunGetOutput('grpcurl', [
        '-plaintext',
        '-d',
        `{"denom":"eth/${eth_token_addr}"}`,
        `127.0.0.1:${this.opts.listen.grpc}`,
        'aiaxbank.v1.Query/DenomRepresentation',
      ])
    );

    return data.internalAddress;
  }

  async getErc20Balance(token_addr: string, addr: string): Promise<any> {
    return (
      await processRunGetOutput('eth', [
        'contract:call',
        '--network',
        `http://127.0.0.1:${this.opts.listen.json_rpc}`,
        `erc20@${token_addr}`,
        `balanceOf("${addr}")`,
      ])
    ).trim();
  }

  async getErc20Name(token_addr: string): Promise<any> {
    return (
      await processRunGetOutput('eth', [
        'contract:call',
        '--network',
        `http://127.0.0.1:${this.opts.listen.json_rpc}`,
        `erc20@${token_addr}`,
        `name()`,
      ])
    ).trim();
  }

  async getErc20Decimals(token_addr: string): Promise<any> {
    return (
      await processRunGetOutput('eth', [
        'contract:call',
        '--network',
        `http://127.0.0.1:${this.opts.listen.json_rpc}`,
        `erc20@${token_addr}`,
        `decimals()`,
      ])
    ).trim();
  }

  async getTransaction(hash: string): Promise<any> {
    return JSON.parse(await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "query",
      "tx",
      hash,
    ], {
      cwd: this.opts.directory,
    }));
  }

  async awaitTransaction(hash: string): Promise<any> {
    while (true) {
      let out = [], err = [];
      try {

        await processRun(this.opts.binary, [
          "--home",
          this.opts.directory,
          "query",
          "tx",
          hash,
        ], {
          cwd: this.opts.directory,
          onStdout: (data) => out.push(data),
          onStderr: (data) => err.push(data),
        });

        return JSON.parse(out.join(''));

      } catch (e) {
        if (!(err.join('').indexOf(`tx (${hash}) not found`))) {
          throw e;
        }
      }

      await new Promise((resolve, _) => setTimeout(resolve, 0.25));
    }
  }

  async txGenesis(key_name: string, amount: string, eth_addr: string, orchestrator_addr: string, eth_sig: string): Promise<void> {
    await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "gentx",
      key_name,
      amount,
      eth_addr,
      orchestrator_addr,
      eth_sig,
      "--chain-id",
      chain_id,
      "--website",
      "https://aiax.network",
      "--ip",
      "127.0.0.1",
      "--node-id",
      this._node_id,
      "--note",
      `${this.node_id}@127.0.0.1:${this.opts.listen.p2p}`,
    ], {
      cwd: this.opts.directory,
    });

    await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "collect-gentxs",
      "--keyring-backend",
      "test",
    ], {
      cwd: this.opts.directory,
    });

    fs.rmSync(path.resolve(this.opts.directory, "config", "gentx"), { recursive: true });
  }

  async txStakingCreateValidator(key_name: string, amount: string): Promise<string> {
    const pubkey = await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "tendermint",
      "show-validator",
    ], {
      cwd: this.opts.directory,
    });

    const data = JSON.parse(await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "tx",
      "staking",
      "create-validator",
      "--from",
      key_name,
      "--amount",
      amount,
      "--pubkey",
      pubkey,
      "--commission-rate",
      "0.10",
      "--commission-max-rate",
      "0.20",
      "--commission-max-change-rate",
      "0.01",
      "--min-self-delegation",
      "1",
      "-y",
    ], {
      cwd: this.opts.directory,
    }));

    await this.awaitTransaction(data.txhash);

    return data.txhash;
  }

  async txGravitySetDelegateKeys(key_name: string, eth_addr: string, orchestrator_addr: string, eth_sig: string): Promise<string> {
    const data = JSON.parse(await processRunGetOutput(this.opts.binary, [
      "--home",
      this.opts.directory,
      "tx",
      "gravity",
      "set-delegate-keys",
      this.val_keys.get(key_name),
      orchestrator_addr,
      eth_addr,
      eth_sig,
      "--from",
      key_name,
      "-y",
    ], {
      cwd: this.opts.directory,
    }));

    await this.awaitTransaction(data.txhash);

    return data.txhash;
  }

  initGenesis() {
    const gen = JSON.parse(fs.readFileSync(this.genesis).toString('utf8'));
    const denom = 'aaiax';
    const gravityId = randomBytes(15).toString('hex');

    setJsonPath(gen, '/app_state/crisis/constant_fee', 'amount', '1000');
    setJsonPath(gen, '/app_state/crisis/constant_fee', 'denom', denom);
    setJsonPath(gen, '/app_state/evm/params', 'evm_denom', denom);
    setJsonPath(gen, '/app_state/feemarket/params', 'no_base_fee', true);
    setJsonPath(gen, '/app_state/gov/deposit_params/min_deposit/0', 'amount', `10${'0'.repeat(18)}`); // Was `1000${'0'.repeat(18)}`
    setJsonPath(gen, '/app_state/gov/deposit_params/min_deposit/0', 'denom', denom);
    setJsonPath(gen, '/app_state/gravity/params', 'average_block_time', '5000');
    setJsonPath(gen, '/app_state/gravity/params', 'average_ethereum_block_time', '14000');
    setJsonPath(gen, '/app_state/gravity/params', 'gravity_id', gravityId);
    setJsonPath(gen, '/app_state/mint/params', 'mint_denom', denom);
    setJsonPath(gen, '/app_state/staking/params', 'unbonding_time', '21600s'); // Was '1814400s'
    setJsonPath(gen, '/app_state/staking/params', 'bond_denom', denom);
    setJsonPath(gen, '/consensus_params/block', 'max_gas', '10000000');

    const dmd = getJsonPath(gen, '/app_state/bank/denom_metadata') as any[];
    dmd.push({
      description: 'Aiax token',
      name: 'Aiax token',
      display: 'aiax',
      symbol: 'AXX',
      base: 'aaiax',
      denom_units: [
        {
          denom: 'aaiax',
          exponent: 0,
          aliases: ['attoaiax', 'wei'],
        },
        {
          denom: 'maiax',
          exponent: 15,
          aliases: ['milliaiax'],
        },
        {
          denom: 'aiax',
          exponent: 18,
          aliases: ['AXX'],
        },
      ],
    });

    fs.writeFileSync(this.genesis, JSON.stringify(gen, null, 2));
  }

  start(): Promise<void> {
    if (this.proc) {
      return Promise.resolve();
    }

    this.proc = new ProcessWrapper(this.opts.binary, [
      "--home",
      this.opts.directory,
      "start",
    ], {
      cwd: this.opts.directory,
      killIfNoEvents: [{ event: 'started', timeout: 5000 }],
      onStdout: (() => {
        const stdout = path.resolve(this.opts.directory, 'stdout.log');
        return (data, emitter) => {
          fs.appendFileSync(stdout, data);
        }
      }),
      onStderr: (() => {
        let started = false;
        const stderr = path.resolve(this.opts.directory, 'stderr.log');
        return function (data, emitter) {
          fs.appendFileSync(stderr, data);
          if (!started && data.toString().indexOf('executed block') !== -1) {
            started = true;
            emitter.emit('started');
          }
        };
      })(),
    });

    return this.proc.waitForEvent('started');
  }

  stop(): Promise<number> {
    if (!this.proc) {
      return Promise.reject();
    }

    let kill = this.proc.kill();
    this.proc = null;

    return kill;
  }
}

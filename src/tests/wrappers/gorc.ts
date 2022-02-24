import * as fs from 'fs';
import * as path from 'path';
import toml from '@ltd/j-toml';
import { processRunGetOutput, ProcessWrapper } from "../../proc";

type GorcWrapperOpts = {
  binary: string,
  directory: string,
  gravity_contract: string,
  ports: {
    eth: number,
    cosmos: number,
  },
  listen: {
    metrics: number,
  }
};

type GorcKeys = {
  cosmos: Map<string, string>,
  eth: Map<string, string>,
};

export class GorcWrapper {
  private proc?: ProcessWrapper;
  readonly opts: GorcWrapperOpts;
  private readonly keys: GorcKeys; 
  private readonly cfg: string;

  constructor(opts: GorcWrapperOpts) {
    this.proc = null;
    this.opts = opts;
    this.keys = {
      cosmos: new Map(),
      eth: new Map(),
    };
    fs.mkdirSync(this.opts.directory, { recursive: true });
    this.cfg = this.ensureConfig();
  }

  ensureConfig(): string {
    let dir = this.opts.directory;
    let cfg = path.resolve(this.opts.directory, "config.toml");

    fs.mkdirSync(dir, { recursive: true });

    let data = toml.stringify({
      keystore: path.resolve(dir, 'keystore'),
      gravity: toml.Section({
        contract: this.opts.gravity_contract,
        fees_denom: 'aaiax',
      }),
      ethereum: toml.Section({
        key_derivation_path: "m/44'/60'/0'/0/0",
        rpc: `http://127.0.0.1:${this.opts.ports.eth}`,
      }),
      cosmos: toml.Section({
        key_derivation_path: "m/44'/118'/0'/0/0",
        grpc: `http://127.0.0.1:${this.opts.ports.cosmos}`,
        prefix: 'aiax',
        gas_price: toml.inline({
          amount: BigInt(1000),
          denom: 'aaiax'
        }),
      }),
      metrics: toml.Section({
        listen_addr: `127.0.0.1:${this.opts.listen.metrics}`,
      }),
    }, { newline: '\n' });

    fs.writeFileSync(cfg, data, { flag: 'w' });

    return cfg;
  }

  async ensureCosmosKey(name: string): Promise<string> {
    if (this.keys.cosmos.has(name)) {
      return this.keys.cosmos.get(name);
    }

    let output = await processRunGetOutput(this.opts.binary, [
      "--config",
      this.cfg,
      "keys",
      "cosmos",
      "add",
      name,
    ], {
      cwd: this.opts.directory,
    });

    let addr = output.match('(aiax[a-zA-Z0-9]{32,})($|[\s\n\r])');
    if (!addr) {
      return Promise.reject('Cannot create cosmos gorc key');
    }

    this.keys.cosmos.set(name, addr[1]);
    return addr[1];
  }

  async ensureEthKey(name: string): Promise<string> {
    if (this.keys.eth.has(name)) {
      return this.keys.eth.get(name);
    }

    let output = await processRunGetOutput(this.opts.binary, [
      "--config",
      this.cfg,
      "keys",
      "eth",
      "add",
      name,
    ], {
      cwd: this.opts.directory,
    });

    let addr = output.match('(0x[a-zA-Z0-9]{32,})($|[\s\n\r])');
    if (!addr) {
      return Promise.reject('Cannot create eth gorc key');
    }

    this.keys.eth.set(name, addr[1]);
    return addr[1];
  }

  async signDelegateKeys(eth_key_name: string, validator_addr: string, nonce?: number): Promise<string> {
    let output = await processRunGetOutput(this.opts.binary, [
      "--config",
      this.cfg,
      "sign-delegate-keys",
      "--args",
      eth_key_name,
      validator_addr,
      ...(typeof nonce === 'number' ? [nonce.toString()] : []),
    ], {
      cwd: this.opts.directory,
    });

    let sign = output.match('(0x[a-zA-Z0-9]{32,})($|[\s\n\r])');
    if (!sign) {
      return Promise.reject('Cannot create eth gorc key');
    }

    return sign[1];
  }

  async txEthToCosmos(token: string, key_name: string, dest: string, amount: string): Promise<void> {
    await processRunGetOutput(this.opts.binary, [
      "--config",
      this.cfg,
      "eth-to-cosmos",
      token,
      key_name,
      this.opts.gravity_contract,
      dest,
      amount,
      "1",
    ], {
      cwd: this.opts.directory,
    });
  }

  async txCosmosToEth(denom: string, key_name: string, dest: string, amount: string): Promise<void> {
    await processRunGetOutput(this.opts.binary, [
      "--config",
      this.cfg,
      "cosmos-to-eth",
      denom,
      amount,
      key_name,
      dest,
      "1",
    ], {
      cwd: this.opts.directory,
    });
  }

  start(cosmos_key: string, eth_key: string): Promise<void> {
    if (this.proc) {
      return Promise.resolve();
    }

    this.proc = new ProcessWrapper(this.opts.binary, [
      "--config",
      this.cfg,
      "orchestrator",
      "start",
      "--cosmos-key",
      cosmos_key,
      "--ethereum-key",
      eth_key,
    ], {
      cwd: this.opts.directory,
      killIfNoEvents: [{ event: 'started', timeout: 5000 }],
      onStdout: (() => {
        let started = false;
        const stdout = path.resolve(this.opts.directory, 'stdout.log');
        return function (data, emitter) {
          fs.appendFileSync(stdout, data);
          if (!started && data.toString().indexOf('main_loop') !== -1) {
            started = true;
            emitter.emit('started');
          }
        };
      })(),
      // onStderr: (() => {
      //   const stderr = path.resolve(this.opts.directory, 'stderr.log');
      //   return (data, emitter) => {
      //     fs.appendFileSync(stderr, data);
      //   }
      // }),
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
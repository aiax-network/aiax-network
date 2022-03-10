import { contractsDeploy } from "../../contract/deploy";
import { processRunGetOutput, ProcessWrapper } from "../../proc";

const priv_key = '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a';

export class EthWrapper {
  private proc?: ProcessWrapper;
  readonly port: number;

  constructor(port: number) {
    this.port = port;
    this.proc = null;
  }

  start(): Promise<void> {
    if (this.proc) {
      return Promise.reject();
    }

    this.proc = new ProcessWrapper(process.execPath, [
      "./dist/src/index.js",
      "eth",
      "testnode",
      "--hostname",
      "127.0.0.1",
      "--port",
      this.port.toString(),
      "--mine-time-sec",
      "1",
    ], {
      killIfNoEvents: [{ event: 'started', timeout: 5000 }],
      onStdout: (() => {
        let started = false;
        return function (data, emitter) {
          if (!started && data.toString().indexOf('Mined empty block #100') !== -1) {
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

  async deployAiaxToken(): Promise<string> {
    let addrs = await contractsDeploy({
      cosmosNode: `http://localhost:${0}`,
      ethNode: `http://localhost:${this.port}`,
      contracts: 'ERC20AiaxToken',
      ethPrivkey: priv_key,
      updateState: false,
    });

    return addrs[0];
  }

  async deployExternalToken(): Promise<string> {
    let addrs = await contractsDeploy({
      cosmosNode: `http://localhost:${0}`,
      ethNode: `http://localhost:${this.port}`,
      contracts: 'ERC20TokenOne',
      ethPrivkey: priv_key,
      updateState: false,
    });

    return addrs[0];
  }

  async deployGravity(cosmos_port: number): Promise<string> {
    let addrs = await contractsDeploy({
      cosmosNode: `http://localhost:${cosmos_port}`,
      ethNode: `http://localhost:${this.port}`,
      contracts: 'Gravity',
      ethPrivkey: priv_key,
      updateState: false,
    });

    return addrs[0];
  }

  async depositEth(to_addr: string, amount: string): Promise<void> {
    await processRunGetOutput('eth', [
      "transaction:send",
      "--network",
      `http://localhost:${this.port}`,
      "--pk",
      priv_key,
      "--confirmation-blocks=3",
      "--to",
      to_addr,
      "--value",
      amount,
      "--data",
      "0x00",
    ]);
  }

  async depositErc20(erc20_addr: string, to_addr: string, amount: string): Promise<void> {
    await processRunGetOutput('eth', [
      "contract:send",
      "--network",
      `http://localhost:${this.port}`,
      "--pk",
      priv_key,
      "--confirmation-blocks=3",
      `erc20@${erc20_addr}`,
      `transfer("${to_addr}", "${amount}")`,
    ]);
  }

  async getErc20Balance(erc20_addr: string, addr: string): Promise<string> {
    return (
      await processRunGetOutput('eth', [
        'contract:call',
        "--network",
        `http://localhost:${this.port}`,
        `erc20@${erc20_addr}`,
        `balanceOf("${addr}")`,
      ])
    ).trim();
  }
}
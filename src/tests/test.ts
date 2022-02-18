import * as fs from 'fs';
import * as path from 'path';
import { Command } from "commander";
import { buildEnsureBinaries } from "../build";
import { EthWrapper } from "./wrappers/eth";
import { AiaxdWrapper } from './wrappers/aiaxd';
import { GorcWrapper } from './wrappers/gorc';

type Binaries = { aiaxd: string, gorc: string };
type Node = { aiaxd: AiaxdWrapper, gorc: GorcWrapper, token: string, gravity: string };

let procs = new Array<{ stop: () => Promise<number> }>();

async function build(dir: string): Promise<Binaries> {
  await buildEnsureBinaries({
    targetRoot: dir
  });

  return {
    aiaxd: path.resolve(dir, "bin", "aiax"),
    gorc: path.resolve(dir, "bin", "gorc"),
  };
}

async function initNode(eth: EthWrapper, bin: Binaries, dir: string): Promise<Node> {
  let node = {
    aiaxd: new AiaxdWrapper({
      binary: bin.aiaxd,
      directory: path.resolve(dir, "aiaxd"),
      peers: [],
      ports: {
        eth: eth.port,
      },
      listen: {
        api: 1317,
        grpc: 9090,
        json_rpc: 8545,
        json_rpc_ws: 8546,
        proxy_app: 26658,
        rpc: 26657,
        pprof: 6060,
        p2p: 26656,
      }
    }),
    gorc: new GorcWrapper({
      binary: bin.gorc,
      directory: path.resolve(dir, "gorc"),
      gravity_contract: '',
      ports: {
        eth: eth.port,
        cosmos: 9090,
      }
    }),
    token: '',
    gravity: '',
  };

  procs.push(node.aiaxd);
  procs.push(node.gorc);

  const aiax_token = node.token = await eth.deployAiaxToken();
  console.log(`Deployed aiax token at ${aiax_token}`);

  const node_id = await node.aiaxd.init();
  console.log(`Inited node ${node_id}`);

  node.aiaxd.initGenesis(aiax_token);
  console.log(`Updated genesis`);

  const validator = await node.aiaxd.ensureValKey('validator');
  console.log(`Created aiaxd validator key ${validator}`);

  const orchestrator = await node.gorc.ensureCosmosKey('orchestrator');
  console.log(`Created gorc orchestrator cosmos key ${orchestrator}`);

  const signer = await node.gorc.ensureEthKey('signer');
  console.log(`Created gorc signer eth key ${signer}`);

  await eth.depositEth(signer, '1000000000000000000');
  console.log(`Deposited 1eth to gorc signer`);

  await node.aiaxd.addGenesisAccount('validator', '1000000000000000000000aaiax');
  await node.aiaxd.addGenesisAccount(orchestrator, '1000000000000000000000aaiax');
  console.log(`Updated genesis accounts`);

  const sign = await node.gorc.signDelegateKeys('signer', validator, 0);
  console.log(`Signed delegate keys ${sign.substring(0, 32)}...`);

  await node.aiaxd.gentx('validator', '1000000000000000000000aaiax', signer, orchestrator, sign);
  console.log(`Inited genesis transaction`);

  await node.aiaxd.start();
  await new Promise((resolve, _) => setTimeout(resolve, 5000));
  console.log(`Started aiaxd node`);

  const gravity = node.gravity = await eth.deployGravity(node.aiaxd.opts.listen.rpc);
  console.log(`Deployed gravity contract at ${gravity}`);

  node.gorc.opts.gravity_contract = gravity;
  node.gorc.ensureConfig();

  await node.gorc.start('orchestrator', 'signer');
  console.log(`Started gorc`);

  return node;
}

async function joinNode(eth: EthWrapper, bin: Binaries, dir: string, join: Node): Promise<Node> {
  let node = {
    aiaxd: new AiaxdWrapper({
      binary: bin.aiaxd,
      directory: path.resolve(dir, "aiaxd"),
      peers: [`${join.aiaxd.node_id}@127.0.0.1:${join.aiaxd.opts.listen.p2p}`],
      ports: {
        eth: eth.port,
      },
      listen: {
        api: 1317 + 10,
        grpc: 9090 + 10,
        json_rpc: 8545 + 10,
        json_rpc_ws: 8546 + 10,
        proxy_app: 26658 + 10,
        rpc: 26657 + 10,
        pprof: 6060 + 10,
        p2p: 26656 + 10,
      }
    }),
    gorc: new GorcWrapper({
      binary: bin.gorc,
      directory: path.resolve(dir, "gorc"),
      gravity_contract: join.gravity,
      ports: {
        eth: eth.port,
        cosmos: 9090 + 10,
      }
    }),
    token: join.token,
    gravity: join.gravity,
  };

  procs.push(node.aiaxd);
  procs.push(node.gorc);

  const node_id = await node.aiaxd.init();
  console.log(`Inited node ${node_id}`);

  fs.copyFileSync(join.aiaxd.genesis, node.aiaxd.genesis);
  console.log(`Copied genesis from node ${join.aiaxd.node_id}`);

  const validator = await node.aiaxd.ensureValKey('validator');
  console.log(`Created aiaxd validator key ${validator}`);

  const orchestrator = await node.gorc.ensureCosmosKey('orchestrator');
  console.log(`Created gorc orchestrator cosmos key ${orchestrator}`);

  const signer = await node.gorc.ensureEthKey('signer');
  console.log(`Created gorc signer eth key ${signer}`);

  await eth.depositEth(signer, '1000000000000000000');
  console.log(`Deposited 1eth to gorc signer`);

  await node.aiaxd.start();
  await new Promise((resolve, _) => setTimeout(resolve, 5000));
  console.log(`Started aiaxd node`);

  await node.gorc.start('orchestrator', 'signer');
  console.log(`Started gorc`);

  return node;
}

async function singleNodeTest(opts: any) {
  let base_dir = path.resolve(process.cwd(), "test_data");
  fs.rmSync(base_dir, { recursive: true });

  let bin = await build(base_dir);

  let eth = new EthWrapper(9545);
  procs.push(eth);
  await eth.start();

  let node1 = await initNode(eth, bin, path.resolve(base_dir, "node1"));

  await new Promise((resolve, _) => setTimeout(resolve, 10000));
}

async function multiNodeTest(opts: any) {
  let base_dir = path.resolve(process.cwd(), "test_data");
  fs.rmSync(base_dir, { recursive: true });

  let bin = await build(base_dir);

  let eth = new EthWrapper(9545);
  procs.push(eth);
  await eth.start();

  let node1 = await initNode(eth, bin, path.resolve(base_dir, "node1"));
  let node2 = await joinNode(eth, bin, path.resolve(base_dir, "node2"), node1);

  await new Promise((resolve, _) => setTimeout(resolve, 10000));
}

function wrapStop(test: (any) => Promise<any>) {
  return async function (opts) {
    try {
      await test(opts);
    } finally {
      await Promise.allSettled(procs.map(p => p.stop()));
    }
  };
}

module.exports = function (command: Command) {
  command
    .command('single')
    .description('Perform Aiax network integration tests on single node network')
    .action(wrapStop(singleNodeTest));

  command
    .command('multi')
    .description('Perform Aiax network integration tests on single node network')
    .action(wrapStop(multiNodeTest));
};

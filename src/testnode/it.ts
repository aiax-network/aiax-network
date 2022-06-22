import * as fs from 'fs';
import * as path from 'path';
import assert from 'assert';
import { Command } from 'commander';
import { buildEnsureBinaries } from '../build';
import { EthWrapper } from './wrappers/eth';
import { AiaxdWrapper } from './wrappers/aiaxd';
import { GorcWrapper } from './wrappers/gorc';
import { getGravityNativeToken } from '../contract/utils';

type Binaries = { aiaxd: string; gorc: string };
type Node = { aiaxd: AiaxdWrapper; gorc: GorcWrapper; token: string; gravity: string };

let procs = new Array<{ stop: () => Promise<number> }>();

async function build(dir: string): Promise<Binaries> {
  await buildEnsureBinaries({
    targetRoot: dir,
  });

  return {
    aiaxd: path.resolve(dir, 'bin', 'aiax'),
    gorc: path.resolve(dir, 'bin', 'gorc'),
  };
}

async function initNode(eth: EthWrapper, bin: Binaries, dir: string): Promise<Node> {
  let node = {
    aiaxd: new AiaxdWrapper({
      binary: bin.aiaxd,
      directory: path.resolve(dir, 'aiaxd'),
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
      },
    }),
    gorc: new GorcWrapper({
      binary: bin.gorc,
      directory: path.resolve(dir, 'gorc'),
      gravity_contract: '',
      ports: {
        eth: eth.port,
        cosmos: 9090,
      },
      listen: {
        metrics: 3000,
      },
    }),
    token: '',
    gravity: '',
  };

  procs.push(node.aiaxd);
  procs.push(node.gorc);

  const node_id = await node.aiaxd.init();
  console.log(`Inited node ${node_id}`);

  node.aiaxd.initGenesis();
  console.log(`Updated genesis`);

  const validator = await node.aiaxd.ensureValKey('validator');
  console.log(`Created aiaxd validator key ${validator}`);

  const test_bank = await node.aiaxd.ensureKey('test_bank');
  console.log(`Created aiaxd test_bank key ${test_bank}`);

  const orchestrator = await node.gorc.ensureCosmosKey('orchestrator');
  console.log(`Created gorc orchestrator cosmos key ${orchestrator}`);

  const signer = await node.gorc.ensureEthKey('signer');
  console.log(`Created gorc signer eth key ${signer}`);

  await eth.depositEth(signer, '1000000000000000000');
  console.log(`Deposited 1eth to gorc signer`);

  await node.aiaxd.addGenesisAccount('test_bank', '1000000000000000000000000aaiax');
  await node.aiaxd.addGenesisAccount('validator', '1000000000000000000000aaiax');
  await node.aiaxd.addGenesisAccount(orchestrator, '1000000000000000000000aaiax');
  console.log(`Updated genesis accounts`);

  const sign = await node.gorc.signDelegateKeys('signer', validator, 0);
  console.log(`Signed delegate keys ${sign.substring(0, 32)}...`);

  await node.aiaxd.txGenesis('validator', '1000000000000000000000aaiax', signer, orchestrator, sign);
  console.log(`Inited genesis transaction`);

  await node.aiaxd.start();
  await new Promise((resolve, _) => setTimeout(resolve, 5000));
  console.log(`Started aiaxd node`);

  const gravity = await eth.deployGravityTest(node.aiaxd.opts.listen.rpc);
  node.gravity = gravity.address;
  node.token = await getGravityNativeToken(gravity);
  console.log(`Deployed gravity contract at ${gravity.address} aiax token at ${node.token}`);

  node.gorc.opts.gravity_contract = node.gravity;
  node.gorc.ensureConfig();

  await node.gorc.start('orchestrator', 'signer');
  console.log(`Started gorc`);

  return node;
}

async function joinNode(eth: EthWrapper, bin: Binaries, dir: string, join: Node): Promise<Node> {
  let node = {
    aiaxd: new AiaxdWrapper({
      binary: bin.aiaxd,
      directory: path.resolve(dir, 'aiaxd'),
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
      },
    }),
    gorc: new GorcWrapper({
      binary: bin.gorc,
      directory: path.resolve(dir, 'gorc'),
      gravity_contract: join.gravity,
      ports: {
        eth: eth.port,
        cosmos: 9090 + 10,
      },
      listen: {
        metrics: 3000 + 10,
      },
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

  fs.copyFileSync(
    path.resolve(join.aiaxd.opts.directory, 'keyring-test', 'test_bank.info'),
    path.resolve(node.aiaxd.opts.directory, 'keyring-test', 'test_bank.info')
  );
  console.log(`Copied aiaxd test_bank key from node ${join.aiaxd.node_id}`);

  const orchestrator = await node.gorc.ensureCosmosKey('orchestrator');
  console.log(`Created gorc orchestrator cosmos key ${orchestrator}`);

  const signer = await node.gorc.ensureEthKey('signer');
  console.log(`Created gorc signer eth key ${signer}`);

  await eth.depositEth(signer, '1000000000000000000');
  console.log(`Deposited 1eth to gorc signer`);

  // Here we take the same validator address but with another bech32 prefix
  await join.aiaxd.sendTokens('test_bank', await node.aiaxd.ensureKey('validator'), '1000000000000000000000aaiax');
  console.log(`Deposited 1000aiax to aiax validator`);

  await join.aiaxd.sendTokens('test_bank', orchestrator, '1000000000000000000000aaiax');
  console.log(`Deposited 1000aiax to gorc orchestrator`);

  await node.aiaxd.start();
  await new Promise((resolve, _) => setTimeout(resolve, 5000));
  console.log(`Started aiaxd node`);

  const tx_scv = await node.aiaxd.txStakingCreateValidator('validator', '1000000000000000000000aaiax');
  console.log(`Created aiax validator in transaction ${tx_scv.substring(0, 32)}...`);

  const sign = await node.gorc.signDelegateKeys('signer', validator);
  console.log(`Signed delegate keys ${sign.substring(0, 32)}...`);

  const tx_gsdk = await node.aiaxd.txGravitySetDelegateKeys('validator', signer, orchestrator, sign);
  console.log(`Registered gravity delegate keys in transaction ${tx_gsdk.substring(0, 32)}...`);

  await node.gorc.start('orchestrator', 'signer');
  console.log(`Started gorc`);

  return node;
}

async function testSendNativeToAiaxToken(eth: EthWrapper, node: Node) {
  console.log('[testSendNativeToAiaxToken] Start');

  const src = await node.gorc.ensureCosmosKey('test_native_a');
  const dst = await node.gorc.ensureEthKey('test_native_b');

  await node.aiaxd.sendTokens('test_bank', src, '2000000000000000000aaiax');
  console.log(`Deposited 2aiax to ${src}`);

  await node.gorc.txCosmosToEth('aaiax', 'test_native_a', dst, '1000000000000000000');

  console.log(`Sent cosmos-to-eth transaction, awaiting for balance to change`);
  while ((await eth.getErc20Balance(node.token, dst)) === '0') {
    await new Promise((resolve, _) => setTimeout(resolve, 1000));
  }

  let balance = await eth.getErc20Balance(node.token, dst);
  assert.equal(balance, '1000000000000000000');

  console.log('[testSendNativeToAiaxToken] Ok');
}

async function testSendAiaxTokenToNative(eth: EthWrapper, node: Node) {
  console.log('[testSendAiaxTokenToNative] Start');

  const src = await node.gorc.ensureEthKey('test_native_b');
  const dst = await node.gorc.ensureCosmosKey('test_native_c');

  await eth.depositEth(src, '1000000000000000000');
  console.log(`Deposited 1eth to ${src}`);

  await node.gorc.txEthToCosmos(node.token, 'test_native_b', dst, '1000000000000000000');

  console.log(`Sent eth-to-cosmos transaction, awaiting for balance to change`);
  while ((await node.aiaxd.getBalances(dst)).balances.length == 0) {
    await new Promise((resolve, _) => setTimeout(resolve, 1000));
  }

  let balance = (await node.aiaxd.getBalances(dst)).balances[0];
  assert.equal(balance.denom, 'aaiax');
  assert.equal(balance.amount, '1000000000000000000');

  console.log('[testSendAiaxTokenToNative] Ok');
}

async function testSendExternalTokenToAiax(eth: EthWrapper, node: Node, token_addr: string) {
  console.log('[testSendExternalTokenToAiax] Start');

  const src = await node.gorc.ensureEthKey('test_testSendExternalTokenToAiax_src');
  const dst = await node.gorc.ensureCosmosKey('test_testSendExternalTokenToAiax_dst');
  const dst_eth = (await node.aiaxd.parseKey(dst))[0];

  await eth.depositEth(src, '1000000000000000000');
  console.log(`Deposited 1eth to ${src}`);
  await eth.depositErc20(token_addr, src, '1000000000000000000');
  console.log(`Deposited erc20 1tone to ${src}`);

  await node.gorc.txEthToCosmos(token_addr, 'test_testSendExternalTokenToAiax_src', dst, '1000000000000000000');

  console.log(`Sent eth-to-cosmos transaction, awaiting for erc20 to be mapped in aiax`);
  while (!(await node.aiaxd.getErc20Mapping(token_addr))) {
    await new Promise((resolve, _) => setTimeout(resolve, 1000));
  }

  const mapping_addr = await node.aiaxd.getErc20Mapping(token_addr);

  let balance = await node.aiaxd.getErc20Balance(mapping_addr, dst_eth);
  assert.equal(balance, '1000000000000000000');
  let name = await node.aiaxd.getErc20Name(mapping_addr);
  assert.equal(name, `eth/${token_addr}`);

  console.log('[testSendExternalTokenToAiax] Ok');
}

async function testSendAiaxToExternalToken(eth: EthWrapper, node: Node, token_addr: string) {
  console.log('[testSendAiaxToExternalToken] Start');

  const src = await node.gorc.ensureCosmosKey('test_testSendExternalTokenToAiax_dst');
  const dst = await node.gorc.ensureEthKey('test_testSendAiaxToExternalToken_dst');

  await node.aiaxd.sendTokens('test_bank', src, '1000000000000000000aaiax');
  console.log(`Deposited 1aiax to ${src}`);

  await node.gorc.txCosmosToEth(
    `eth/${token_addr}`,
    'test_testSendExternalTokenToAiax_dst',
    dst,
    '900000000000000000'
  );

  console.log(`Sent cosmos-to-eth transaction, awaiting for balance to change`);
  while ((await eth.getErc20Balance(token_addr, dst)) === '0') {
    await new Promise((resolve, _) => setTimeout(resolve, 1000));
  }

  let balance = await eth.getErc20Balance(token_addr, dst);
  assert.equal(balance, '900000000000000000');

  console.log('[testSendAiaxToExternalToken] Ok');
}

async function singleNodeTest(opts: any) {
  let base_dir = path.resolve(process.cwd(), 'test_data');
  fs.rmSync(base_dir, { force: true, recursive: true });

  let bin = await build(base_dir);
  let eth = new EthWrapper(9545);
  procs.push(eth);
  await eth.start();

  let node1 = await initNode(eth, bin, path.resolve(base_dir, 'node1'));

  console.log('Testnet is online, running for 30sec to be sure that all events are processed');
  await new Promise((resolve, _) => setTimeout(resolve, 30000));

  await testSendNativeToAiaxToken(eth, node1);
  await testSendAiaxTokenToNative(eth, node1);

  const external_token = await eth.deployExternalToken();
  console.log(`Deployed external etc20 token at ${external_token}`);

  await testSendExternalTokenToAiax(eth, node1, external_token);
  await testSendAiaxToExternalToken(eth, node1, external_token);
}

async function multiNodeTest(opts: any) {
  let base_dir = path.resolve(process.cwd(), 'test_data');
  fs.rmSync(base_dir, { force: true, recursive: true });

  let bin = await build(base_dir);

  let eth = new EthWrapper(9545);
  procs.push(eth);
  await eth.start();

  let node1 = await initNode(eth, bin, path.resolve(base_dir, 'node1'));
  let node2 = await joinNode(eth, bin, path.resolve(base_dir, 'node2'), node1);

  console.log('Testnet is online, running for 60sec to be sure that all events are processed');
  await new Promise((resolve, _) => setTimeout(resolve, 60000));

  await testSendNativeToAiaxToken(eth, node2);
  await testSendAiaxTokenToNative(eth, node2);

  const external_token = await eth.deployExternalToken();
  console.log(`Deployed external etc20 token at ${external_token}`);

  await testSendExternalTokenToAiax(eth, node2, external_token);
  await testSendAiaxToExternalToken(eth, node2, external_token);
}

function wrapStop(test: (any) => Promise<any>) {
  return async function (opts) {
    try {
      await test(opts);
    } catch (e) {
      await Promise.allSettled(procs.map((p) => p.stop()));
      throw e;
    }
    await Promise.allSettled(procs.map((p) => p.stop()));
  };
}

module.exports = function (command: Command) {
  command
    .command('it-single')
    .description('Perform Aiax network integration tests on single node network')
    .action(wrapStop(singleNodeTest));

  command
    .command('it-multi')
    .description('Perform Aiax network integration tests on single node network')
    .action(wrapStop(multiNodeTest));
};

import type { Command } from 'commander';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import iip from 'internal-ip';
import * as path from 'path';
import rimraf from 'rimraf';
import { aiaxConfigApply, aiaxKeyEnsure, aiaxKeyGetBechAddress, aiaxRun, aiaxRunGetOutput } from '../../aiax';
import { buildEnsureBinaries } from '../../build';
import { contractsDeploy } from '../../contract/deploy';
import env, { denomBase } from '../../env';
import { gorcConfigApply, gorcKeyEnsure, gorcKeyEthEnsure, gorcKeyImport, gorcSignDelegateKeys } from '../../gorc';
import { getJsonPath, setJsonPath } from '../../utils';

export interface NodeInitOpts {
  trunc?: boolean;
  keyringBackend?: string;
  debug?: boolean;
  ip?: string;
  nodeId?: string;
  ethRpcAddress?: string;
  ethRpcWsAddress?: string;
  ethExternalRpcAddress?: string;
  gorcAccountAmount?: string;
  validatorAccountAmount?: string;
}

async function testNodeInitGenesis(): Promise<any> {
  const gpath = path.resolve(env.configRoot, 'genesis.json');
  const gen = JSON.parse(fs.readFileSync(gpath).toString('utf8'));
  const denom = denomBase();
  const gravityId = randomBytes(15).toString('hex');

  setJsonPath(gen, '/app_state/crisis/constant_fee', 'amount', '1000'); // TODO:
  setJsonPath(gen, '/app_state/crisis/constant_fee', 'denom', denom);
  setJsonPath(gen, '/app_state/evm/params', 'evm_denom', denom);
  setJsonPath(gen, '/app_state/feemarket/params', 'no_base_fee', true);
  setJsonPath(gen, '/app_state/gov/deposit_params/min_deposit/0', 'amount', `1000${'0'.repeat(18)}`);
  setJsonPath(gen, '/app_state/gov/deposit_params/min_deposit/0', 'denom', denom);
  setJsonPath(gen, '/app_state/gravity/params', 'average_block_time', '5000');
  setJsonPath(gen, '/app_state/gravity/params', 'average_ethereum_block_time', '14000');
  setJsonPath(gen, '/app_state/gravity/params', 'gravity_id', gravityId);
  setJsonPath(gen, '/app_state/mint/params', 'mint_denom', denom);
  setJsonPath(gen, '/app_state/staking/params', 'bond_denom', denom);
  setJsonPath(gen, '/consensus_params/block', 'max_gas', '10000000');

  const dmd = getJsonPath(gen, '/app_state/bank/denom_metadata') as any[];
  dmd.push({
    description: 'Aiax token',
    name: 'Aiax token',
    display: 'aiax',
    symbol: env.symbol,
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
        aliases: [env.symbol],
      },
    ],
  });

  fs.writeFileSync(gpath, JSON.stringify(gen, null, 2));
}

async function testNodeGenTx(opts: NodeInitOpts): Promise<any> {
  const validatorAmount = opts.validatorAccountAmount;
  const gorcAmount = opts.gorcAccountAmount;

  const valKey = await aiaxKeyEnsure(env.validatorKey, opts.keyringBackend);
  valKey.address = await aiaxKeyGetBechAddress(valKey.name, 'val', opts.keyringBackend);

  const gorcKey = await gorcKeyEnsure(env.orchestratorKey);
  const gorcEthKey = await gorcKeyEthEnsure(env.validatorEthKey);

  await aiaxRun(['add-genesis-account', env.validatorKey, validatorAmount, '--keyring-backend', opts.keyringBackend]);
  await aiaxRun(['add-genesis-account', gorcKey.address, gorcAmount, '--keyring-backend', opts.keyringBackend]);

  const ethSig = await gorcSignDelegateKeys(gorcEthKey.name, valKey.address);

  // aiax gentx [key_name] [amount] [eth-address] [orchestrator-address] [eth-sig] [flags]
  await aiaxRun([
    'gentx',
    env.validatorKey,
    validatorAmount,
    gorcEthKey.address,
    gorcKey.address,
    ethSig,
    '--chain-id',
    env.chainId,
    '--keyring-backend',
    opts.keyringBackend,
    '--website',
    env.website,
    '--ip',
    opts.ip,
    '--node-id',
    opts.nodeId,
    '--note',
    `${opts.nodeId}@${opts.ip}:26656`,
  ]);

  await aiaxRunGetOutput(['collect-gentxs', '--chain-id', env.chainId]);

  console.log(`testnode init | validator address: ${valKey.address}`);
  console.log(`testnode init | orchestrator address: ${gorcKey.address}`);
  console.log(`testnode init | orchestrator eth address: ${gorcEthKey.address}`);
}

async function testNodeInitConfig(opts: NodeInitOpts) {
  const ret = JSON.parse(await aiaxRunGetOutput(['init', env.moniker, '--chain-id', env.chainId]));
  if (opts.nodeId == null) {
    opts.nodeId = ret['node_id'];
  }

  const gorcApply = {
    cosmos: {},
  };
  const aiaxApply = {
    'minimum-gas-prices': '0aaiax',
    api: {
      enable: true,
      swagger: true,
    },
  };
  if (opts.ethRpcAddress) {
    (aiaxApply['json-rpc'] = aiaxApply['json-rpc'] || {})['address'] = opts.ethRpcAddress;
    (gorcApply['ethereum'] = gorcApply['ethereum'] || {})['rpc'] = opts.ethExternalRpcAddress;
  }
  if (opts.ethRpcWsAddress) {
    (aiaxApply['json-rpc'] = aiaxApply['json-rpc'] || {})['ws-address'] = opts.ethRpcWsAddress;
  }

  await aiaxConfigApply(aiaxApply);
  await gorcConfigApply(gorcApply);

  await aiaxRun(['config', 'keyring-backend', opts.keyringBackend || 'test']);
  await aiaxRun(['config', 'chain-id', env.chainId]);
  await testNodeInitGenesis();
  await testNodeInitExternalContracts(opts);
  await testNodeGenTx(opts);
}

async function testNodeInitExternalContracts(opts: NodeInitOpts) {
  await contractsDeploy({
    contracts: 'ERC20TokenOne',
    ethNode: opts.ethExternalRpcAddress || 'http://localhost:8545',
    ethPrivkey: '0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e',
    updateState: true,
  });
}

async function testNodeGorcEthKeysImport() {
  const keys = [
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
    '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  ];
  for (let i = 0; i < keys.length; ++i) {
    await gorcKeyImport(`acc${i}`, keys[i], true);
  }
}

async function testNodeInit(opts: NodeInitOpts) {
  opts = opts || {};
  if (opts.ip == null || opts.ip === 'auto') {
    opts.ip = await iip.v4();
    if (opts.ip == null) {
      console.warn('testnode init | Unable to determine network interafce IPv4 address, 127.0.0.1 will be used');
      opts.ip = '127.0.0.1';
    }
  }
  if (env.verbose) {
    console.log(`testnode init | options: ${JSON.stringify(opts, null, 2)}`);
  }
  console.log('testnode init | Init test node environment...');
  if (opts.trunc === true) {
    console.warn(`testnode init | Remove aiax root directory: ${env.aiaxRoot}`);
    rimraf.sync(env.aiaxRoot);
  } else {
    console.warn(`testnode init | Removing ${env.configRoot}`);
    rimraf.sync(env.configRoot);
    console.warn(`testnode init | Removing ${env.dataRoot}`);
    rimraf.sync(env.dataRoot);
  }
  await buildEnsureBinaries({
    debug: !!opts.debug,
  });
  await testNodeInitConfig(opts);
  await testNodeGorcEthKeysImport();
}

module.exports = function (command: Command) {
  command
    .command('init')
    .description('Init test node instance')
    .option('-t, --trunc', 'Remove aiax root directory', false)
    .option('-k, --keyring-backend <backend>', 'Node keyring backend', 'test')
    .option('--ip', 'Node ipv4 address', 'auto')
    .option('-d, --debug', 'Build debug versions of binary artifacts', false)
    .option('--eth-rpc-address <address>', 'Ethereum JSON RPC listen address', '0.0.0.0:9545')
    .option('--eth-rpc-ws-address <address>', 'Ethereum JSON RPC listen websocket address', '0.0.0.0:9546')
    .option(
      '--eth-external-rpc-address <address>',
      'External ethereum network RPC HTTP address',
      'http://localhost:8545'
    )
    .option(
      '--validator-account-amount <amount>',
      'Amount given to validator node account',
      '1000000000000000000000aaiax'
    )
    .option('--gorc-account-amount <amount>', 'Amount given to orchestrator account', '1000000000000000000000aaiax')
    .action((opts) =>
      testNodeInit({
        ...opts,
      })
    );
};

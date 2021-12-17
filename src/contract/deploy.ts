import { createProtobufRpcClient, QueryClient } from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import type { Command } from 'commander';
import { BigNumber, Contract, ethers, Wallet } from 'ethers';
import * as fs from 'fs';
import hre from 'hardhat';
import * as path from 'path';
import { SignerSetTx } from '../../extra/gravity-bridge/solidity/gen/gravity/v1/gravity';
import { Query, QueryClientImpl } from '../../extra/gravity-bridge/solidity/gen/gravity/v1/query';
import env from '../env';
import { gorcConfigApply, gorcEthKeyShow } from '../gorc';
import { Gravity } from '../typechain';
import { setJsonPath, valueOrFile } from '../utils';

interface DeployOpts {
  cosmosNode?: string;
  ethNode: string;
  ethPrivkey: string;
  ethSupplyValidatorBalance?: string;
  contracts: string;
}

const optsDefault: DeployOpts = {
  cosmosNode: 'http://localhost:26657',
  ethNode: 'http://localhost:8545',
  contracts: 'Gravity',
} as any;

async function getQueryService(opts: DeployOpts): Promise<Query> {
  const cosmosNode = opts.cosmosNode;
  const tendermintClient = await Tendermint34Client.connect(cosmosNode);
  const queryClient = new QueryClient(tendermintClient);
  const rpcClient = createProtobufRpcClient(queryClient);
  return new QueryClientImpl(rpcClient);
}

async function getGravityId(opts: DeployOpts): Promise<string> {
  const qs = await getQueryService(opts);
  const res = await qs.Params({});
  if (!res.params || !res.params.gravityId) {
    return Promise.reject('contract deploy | Could not retrive gravityId param');
  }
  return res.params.gravityId;
}

async function getLatestValset(opts: DeployOpts): Promise<SignerSetTx> {
  const qs = await getQueryService(opts);
  const res = await qs.LatestSignerSetTx({});
  if (!res || !res.signerSet) {
    return Promise.reject('contract deploy | Could not retrieve signer set');
  }
  return res.signerSet;
}

async function checkValidatorAddress(opts: DeployOpts, wallet: Wallet) {
  const addr = await gorcEthKeyShow(env.validatorEthKey);
  const provider = wallet.provider;
  const sb = ethers.utils.parseEther(opts.ethSupplyValidatorBalance);
  const ab = BigNumber.from(await provider.getBalance(addr));
  const db = sb.sub(ab);

  if (db.isZero() || db.isNegative()) {
    console.log(`contract deploy | Validator ${addr} has minimal balance: ${opts.ethSupplyValidatorBalance}eth`);
    return;
  }
  await wallet.sendTransaction({
    to: addr,
    value: db,
  });
  console.log(`contract deploy | ${ethers.utils.formatEther(db)}eth sent to ${addr}`);
}

async function submitGravityAddress(address: string) {
  // Update gorc configuration
  await gorcConfigApply({ gravity: { contract: address } });
}

export async function contractsDeploy(opts: DeployOpts): Promise<string[]> {
  const provider = await new ethers.providers.JsonRpcProvider(opts.ethNode);
  const wallet = new ethers.Wallet(await valueOrFile(opts.ethPrivkey), provider);
  const res = [];
  const tasks = opts.contracts
    .split(',')
    .filter((n, idx, self) => self.indexOf(n) === idx)
    .map((n) => {
      n = n.trim();
      if (n === 'Gravity') {
        return () => contractGravityDeploy(n, opts, wallet);
      } else if (n == 'ERC20AiaxToken') {
        return () => contractAiaxTokenDeploy(n, opts, wallet);
      } else {
        return () => contractDeploy(n, opts, wallet);
      }
    });

  for (let i = 0; i < tasks.length; ++i) {
    res.push(await tasks[i]());
  }
  if (opts.ethSupplyValidatorBalance) {
    await checkValidatorAddress(opts, wallet);
  }
  return res;
}

async function contractDeploy(name: string, _opts: DeployOpts, wallet: Wallet): Promise<string> {
  const { abi, bytecode } = await hre.artifacts.readArtifact(name);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = (await factory.deploy()) as unknown as Contract;
  await contract.deployed();
  console.log(`contract deploy | ${name} deployed at ${contract.address}`);
  return contract.address;
}

async function contractAiaxTokenDeploy(name: string, opts: DeployOpts, wallet: Wallet): Promise<string> {
  const address = await contractDeploy(name, opts, wallet);
  const gpath = path.resolve(env.configRoot, 'genesis.json');
  const gen = JSON.parse(fs.readFileSync(gpath).toString('utf8'));
  setJsonPath(gen, '/app_state/aiax/params', 'aiax_token_contract_address', address);
  fs.writeFileSync(gpath, JSON.stringify(gen, null, 2));
  return address;
}

async function contractGravityDeploy(name: string, opts: DeployOpts, wallet: Wallet): Promise<string> {
  const gravityId = ethers.utils.formatBytes32String(await getGravityId(opts));
  const { abi, bytecode } = await hre.artifacts.readArtifact(name);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  const lvs = await getLatestValset(opts);
  const eth_addresses = [];
  const powers: number[] = [];
  let powers_sum = 0;

  if (env.verbose) {
    console.log(`contract deploy | Latest valset ${JSON.stringify(lvs, null, 2)}`);
  }

  for (let i = 0; i < lvs.signers.length; i++) {
    if (lvs.signers[i].ethereumAddress == '') {
      continue;
    }
    eth_addresses.push(lvs.signers[i].ethereumAddress);
    powers.push(lvs.signers[i].power.toNumber());
    powers_sum += lvs.signers[i].power.toNumber();
  }
  // 66% of uint32_max
  let vote_power = 2834678415;
  if (powers_sum < vote_power) {
    return Promise.reject(`contract deploy | Refusing to deploy! Incorrect power! Please inspect the validator set below
    If less than 66% of the current voting power has unset Ethereum Addresses we refuse to deploy`);
  }

  const gravity = (await factory.deploy(gravityId, vote_power, eth_addresses, powers)) as unknown as Gravity;
  await gravity.deployed();

  console.log(`contract deploy | ${name} deployed at ${gravity.address}`);
  await submitGravityAddress(gravity.address);
  return gravity.address;
}

async function contractsList() {
  ['Gravity', 'ERC20TokenOne', 'ERC20AiaxToken'].forEach((c) => console.log(c));
}

export function command(command: Command) {
  command
    .command('list')
    .description('List of contract names available for deployment')
    .action(() => contractsList());

  command
    .command('deploy')
    .description('Deploy Aiax bridge contract')
    .option('--cosmos-node <node>', 'Cosmos node Tendermint ABCI RPC', optsDefault.cosmosNode)
    .option('--eth-node <node>', 'Ethereum node JSON RPC', optsDefault.ethNode)
    .option('-c, --contracts <contract>', 'Comma separated contract names', optsDefault.contracts)
    .option(
      '--eth-supply-validator-balance <balance>',
      'Ensure and supply if needed minimal validator ethereum address balance'
    )
    .requiredOption('--eth-privkey <privkey>', 'Ethereum private key used for deployment')
    .action((opts) => contractsDeploy({ ...optsDefault, ...opts } as DeployOpts) as any);
}

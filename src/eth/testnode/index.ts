import type { Command } from 'commander';
import hre from 'hardhat';
import { TASK_NODE, TASK_NODE_SERVER_READY } from 'hardhat/builtin-tasks/task-names';
import { subtask, task } from 'hardhat/config';
//import { HARDHAT_NETWORK_NAME } from 'hardhat/internal/constants';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import env from '../../env';

interface EthTestNodeOpts {
  hostname?: string;
  port?: string | number;
  mineTimeSec?: number;
}

function getNodeOpts(henv: HardhatRuntimeEnvironment): EthTestNodeOpts {
  const opts = (henv as any)['$opts'];
  if (!opts) {
    throw new Error('eth testnode | Failed to get $opts object');
  }
  return opts;
}

async function mine(henv: HardhatRuntimeEnvironment, opts: EthTestNodeOpts) {
  await henv.network.provider.send('evm_mine');
  setTimeout(() => mine(henv, opts), opts.mineTimeSec * 1000);
}

subtask(TASK_NODE_SERVER_READY).setAction(async (_args, henv, runSuper) => {
  const opts = getNodeOpts(henv);
  await runSuper();
  // Premine 100 empty blocks
  for (let i = 0; i < 100; ++i) {
    await henv.network.provider.send('evm_mine');
  }
  if (opts.mineTimeSec > 0) {
    setTimeout(() => mine(henv, opts), opts.mineTimeSec * 1000);
  }
});

task(TASK_NODE).setAction(async (_args, _henv, runSuper) => {
  //const networkConfig = henv.config.networks[HARDHAT_NETWORK_NAME];
  //networkConfig.accounts
  await runSuper();
});

async function ethTestNode(opts_: EthTestNodeOpts) {
  const opts = { ...(opts_ || {}) } as EthTestNodeOpts;
  if (env.verbose) {
    console.log('eth testnode | ', opts);
  }
  if (typeof opts.port === 'string') {
    opts.port = parseInt(opts.port);
  }
  if (typeof opts.mineTimeSec === 'string') {
    opts.mineTimeSec = parseInt(opts.mineTimeSec);
  }
  hre['$opts'] = opts;
  hre.run('node', opts);
}

module.exports = function (command: Command) {
  command
    .command('testnode')
    .description('Run Ethereum test node')
    .option('-h, --hostname <hostname>', 'The host to which bind for new connections', '127.0.0.1')
    .option('-p, --port <port>', 'The port on which to listen for new connections', '8545')
    .option('-m, --mine-time-sec <seconds>', 'Number of seconds to mine new block', '10')
    .action((opts) => ethTestNode(opts));
};

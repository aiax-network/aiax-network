import * as path from 'path';
import * as os from 'os';
import * as pkgjson from '../package.json';
import type { Command } from 'commander';

const homedir = os.homedir();

const env = {
  chainId: 'aiax_1630299616-1',
  version: pkgjson.version,
  moniker: 'localnet',
  loglevel: 'info',
  website: 'https://aiax.network',
  context: process.cwd(),
  nodeRoot: 'extra/aiax-node',
  gravityRoot: 'extra/gravity-bridge',
  aiaxRoot: path.resolve(homedir, '.aiax'),
  configRoot: path.resolve(homedir, '.aiax/config'),
  dataRoot: path.resolve(homedir, '.aiax/data'),
  binRoot: path.resolve(homedir, '.aiax/bin'),
  dirMode: 0o700,
  fileMode: 0o600,
  verbose: false,
  symbol: 'AXX',
  validatorKey: 'validator',
  validatorEthKey: 'validator_eth',
  orchestratorKey: 'orchestrator',
  config: {
    timeout_propose: '5s',
    timeout_prevote: '2s',
    timeout_precommit: '2s',
  },

   denom: {
    0: 'aaiax',
    18: 'aiax',
  },
};

let initialized = false;

function checkEnv() {
  if (initialized) {
    return;
  }
  initialized = true;
  ['aiaxRoot', 'gravityRoot'].forEach((p) => {
    if (!path.isAbsolute(env[p])) {
      env[p] = path.resolve(env.context, env[p]);
    }
  });
  if (env.verbose) {
    console.log(JSON.stringify(env, null, 2));
  }
}

export function denomBase(): string {
  return env.denom[0];
}

export function envInit(program: Command) {
  program.version(pkgjson.version);
  program.option('-v, --verbose', 'Verbose output', false);
  program.on('option:verbose', () => {
    env.verbose = program.opts().verbose;
  });
  program.option('-r, --root <root>', 'Aiax node root folder', '~/.aiax');
  program.on('option:root', (v) => {
    env.aiaxRoot = v;
    env.configRoot = path.resolve(env.aiaxRoot, 'config');
    env.dataRoot = path.resolve(env.aiaxRoot, 'data');
    env.binRoot = path.resolve(env.aiaxRoot, 'bin');
  });
  program.hook('preAction', checkEnv);
  if (env.context == null) {
    env.context = process.cwd();
  }
}

export default env;

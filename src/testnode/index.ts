import type { Command } from 'commander';
import env from '../env';

function command(program: Command) {
  env.validatorKey = 'testnodevalidator';
  env.validatorEthKey = `${env.validatorKey}_eth`;
  env.orchestratorKey = 'testnodeorchestrator';

  const c = program.command('testnode').description('Aiax test node operations');
  require('./init/testnode-init')(c);
  require('./it/it-tests')(c);
}

export default command;

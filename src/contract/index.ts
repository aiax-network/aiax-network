import type { Command } from 'commander';

function contractCmd(program: Command) {
  const c = program.command('contract').description('Aiax Ethereum bridge contract operations');
  require('./deploy').command(c);
};

export default contractCmd;

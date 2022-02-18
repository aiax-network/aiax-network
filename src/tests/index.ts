import type { Command } from 'commander';

function command(program: Command) {
  const c = program.command('tests').description('Aiax test node operations');
  require('./test')(c);
}

export default command;

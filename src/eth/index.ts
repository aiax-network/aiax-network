import type { Command } from 'commander';

export default function command(program: Command) {
  const c = program.command('eth').description('Ethereum network commands');
  require('./testnode')(c);
}

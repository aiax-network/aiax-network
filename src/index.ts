import { program } from 'commander';
import buildCmd from './build';
import contractCmd from './contract';
import { envInit } from './env';
import ethCmd from './eth';
import testnodeCmd from './testnode';


process.on('unhandledRejection', (err) => {
  console.error('Error:', err);
  process.exit(1);
});

envInit(program);
testnodeCmd(program);
contractCmd(program);
ethCmd(program);
buildCmd(program);

program.parse(process.argv);

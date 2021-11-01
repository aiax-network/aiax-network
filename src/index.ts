import { program } from 'commander';
import buildCmd from './build';
import { envInit } from './env';
import testnodeCmd from './testnode';
import contractCmd from './contract';
import ethCmd from './eth';

envInit(program);
testnodeCmd(program);
contractCmd(program);
ethCmd(program);
buildCmd(program);


program.parse(process.argv);

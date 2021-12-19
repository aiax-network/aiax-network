import { Command } from 'commander';
import { processRun, ProcessWrapper } from '../../proc';

const procs = new Array<ProcessWrapper>();


async function ethRun() {
  // processRun("");
}


async function doIt() {
  

}

async function teardown() {
  for (let i = procs.length - 1; i >= 0; --i) {
    procs[i].kill();
  }
}

module.exports = function (command: Command) {
  command
    .command('it')
    .description('Perform Aiax network integration tests')
    .action((_) => doIt());
};

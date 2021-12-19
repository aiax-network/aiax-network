import colors from 'colors';
import { Command } from 'commander';
import env from '../../env';
import { ProcessWrapper } from '../../proc';

const index = './dist/src/index.js';
const procs = new Array<ProcessWrapper>();

function ethRun(): ProcessWrapper {
  const proc = new ProcessWrapper('node', [index, 'eth', 'testnode'], {
    tag: 'eth',
    killIfNoEvents: [{ event: 'started', timeout: 5000 }],
    onStdout: (() => {
      let started = false;
      return function (data, emitter) {
        if (env.verbose) {
          process.stdout.write(data);
        }
        if (!started && data.toString().indexOf('Mined empty block #100') !== -1) {
          started = true;
          emitter.emit('started');
        }
      };
    })(),
  });
  procs.push(proc);
  return proc;
}

async function doIt(): Promise<any> {
  await ethRun().waitForEvent('started');
  console.log(colors.green('Local Ethereum node started'));

  console.log(colors.yellow('Waiting for completion of all child processes'));
  await Promise.all(procs.map((p) => p.completion));
  console.log(colors.green('DONE'));
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

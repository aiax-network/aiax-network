import path from 'path';

import colors from 'colors';
import { Command } from 'commander';
import env from '../../env';
import { ProcessWrapper } from '../../proc';

const index = './dist/src/index.js';
const node = 'node';
const procs = new Array<ProcessWrapper>();

function ethRun(): ProcessWrapper {
  const proc = new ProcessWrapper(node, [index, 'eth', 'testnode'], {
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

function aiaxNodeInit(): ProcessWrapper {
  return new ProcessWrapper(node, [index, 'testnode', 'init', '-t', ...commonAjaxArgs()], {
    tag: 'testnode',
  });
}

function aiaxNodeStart(): ProcessWrapper {
  const proc = new ProcessWrapper(path.join(env.binRoot, 'aiax'), ['start'], {
    tag: 'aiax',
    killIfNoEvents: [{ event: 'started', timeout: 10000 }],
    onStderr: (() => {
      let started = false;
      return function (data, emitter) {
        if (env.verbose) {
          process.stderr.write(data);
        }
        if (!started && data.toString().indexOf('executed block') !== -1) {
          started = true;
          emitter.emit('started');
        }
      };
    })(),
  });
  procs.push(proc);
  return proc;
}

function commonAjaxArgs(): string[] {
  const args = ['-r', env.aiaxRoot];
  if (env.verbose) {
    args.push('-v');
  }
  return args;
}

async function doIt(): Promise<any> {
  try {
    await ethRun().waitForEvent('started');
    console.log(colors.green('* Local Ethereum node started'));

    let code = await aiaxNodeInit().completion;
    if (code !== 0) {
      return Promise.reject('Failed to initialise testnode');
    } else {
      console.log(colors.green('* Aiax testnode initialized'));
    }

    console.log(colors.green('* Aiax node starting...'));
    await aiaxNodeStart().waitForEvent('started');
    console.log(colors.green('* Aiax node online'));


  } finally {
    teardown();
  }
  console.log(colors.green('* Done'));
}

async function teardown() {
  console.log(colors.yellow('* Teardown...'))
  let p;
  while ((p = procs.pop())) {
    await p.kill().catch((e) => console.warn(e));
  }
}

module.exports = function (command: Command) {
  command
    .command('it')
    .description('Perform Aiax network integration tests')
    .action((_) => doIt());
};

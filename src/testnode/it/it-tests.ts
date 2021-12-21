import path from 'path';
import assert from 'assert';

import colors from 'colors';
import { Command } from 'commander';
import env from '../../env';
import { processRunGetOutput, ProcessWrapper } from '../../proc';
import { aiaxKeyEnsure, aiaxKeyParse } from '../../aiax';

const index = './dist/src/index.js';
const node = 'node';
const procs = new Array<ProcessWrapper>();

let currentReciever = '';
const aiaxTokenAddress = '0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f';
const sendToCosmosTimeout = 2 * 60 * 1000;

function procByTag(tag: string): ProcessWrapper {
  const res = procs.find((p) => p.tag === tag);
  if (res === undefined) {
    throw new Error('Cannot find process by tag: ' + tag);
  }
  return res;
}

function ethRun(): ProcessWrapper {
  const proc = new ProcessWrapper(node, [index, 'eth', 'testnode'], {
    tag: 'eth',
    killIfNoEvents: [{ event: 'started', timeout: 5000 }],
    onStdout: (() => {
      let started = false;
      return function (data, emitter) {
        if (env.verbose) {
          //process.stdout.write(data);
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
  return new ProcessWrapper(node, [index, 'testnode', 'init', '-t', ...fallThroughArgs()], {
    tag: 'testnode',
  });
}

function aiaxNodeStart(): ProcessWrapper {
  const proc = new ProcessWrapper(path.join(env.binRoot, 'aiax'), ['start'], {
    tag: 'aiax',
    killIfNoEvents: [{ event: 'started', timeout: 10000 }],
    onStdout: (data) => {
      if (env.verbose) {
        process.stdout.write(data);
      }
    },
    onStderr: (() => {
      let started = false;
      return function (data, emitter) {
        if (env.verbose) {
          process.stderr.write(data);
        }
        data = data.toString();
        if (!started && data.indexOf('executed block') !== -1) {
          started = true;
          emitter.emit('started');
        } else if (data.indexOf(`Minted 10 on ${currentReciever}`) !== -1) {
          emitter.emit('minted10');
        } else if (
          data.indexOf(
            `SendToCosmos completed, coins: 10aiax contract: ${aiaxTokenAddress} reciever: ${currentReciever} minted: true`
          ) !== -1
        ) {
          emitter.emit('minted10aiax');
        }
      };
    })(),
  });
  procs.push(proc);
  return proc;
}

function deployEthereumContracts(): ProcessWrapper {
  console.log(colors.green('* Deploying Gravity contract...'));
  return new ProcessWrapper(
    node,
    [
      index,
      'contract',
      'deploy',
      '--contracts=Gravity',
      '--eth-privkey=0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e',
      '--eth-supply-validator-balance=1',
      ...fallThroughArgs(),
    ],
    {
      tag: 'deploy',
    }
  );
}

function orchestratorRun(): ProcessWrapper {
  const proc = new ProcessWrapper(
    path.join(env.binRoot, 'gorc'),
    [
      '-c',
      path.join(env.configRoot, 'gorc.toml'),
      'orchestrator',
      'start',
      '--cosmos-key=testnodeorchestrator',
      '--ethereum-key=testnodevalidator_eth',
    ],
    {
      tag: 'orchestrator',
      killIfNoEvents: [{ event: 'started', timeout: 30000 }],
      onStderr: (data) => {
        if (env.verbose) {
          process.stderr.write(data);
        }
      },
      onStdout: (() => {
        let started = false;
        return function (data, emitter) {
          if (env.verbose) {
            process.stdout.write(data);
          }
          data = data.toString();
          if (!started && data.indexOf('Successfully updated Valset with new Nonce') !== -1) {
            started = true;
            emitter.emit('started');
          } else if (
            data.indexOf(
              `Oracle observed deposit with ethereum sender 0x70997970C51812dc3A010C7d01b50e0d17dc79C8, cosmos_reciever ${currentReciever}, amount 10`
            ) !== -1
          ) {
            emitter.emit('deposit10');
          }
        };
      })(),
    }
  );
  procs.push(proc);
  return proc;
}

async function testSendExternalTokenToAiax() {
  console.log(colors.cyan('* Test send external erc20 token to aiax...'));
  currentReciever = (await aiaxKeyEnsure('testSendExternalToken')).address;
  const ethAddress = (await aiaxKeyParse(currentReciever))[0];

  const tokenOneAddress = '0xB581C9264f59BF0289fA76D61B2D0746dCE3C30D';
  const code = await new ProcessWrapper(path.join(env.binRoot, 'gorc'), [
    '-c',
    path.join(env.configRoot, 'gorc.toml'),
    'eth-to-cosmos',
    tokenOneAddress,
    'acc1',
    '0xC469e7aE4aD962c30c7111dc580B4adbc7E914DD',
    ethAddress.substring(2),
    '10',
    '1',
  ]).completion;
  assert.equal(code, 0, 'Send to cosmos exit code');

  await Promise.all([
    procByTag('orchestrator').waitForEvent('deposit10', sendToCosmosTimeout),
    procByTag('aiax').waitForEvent('minted10', sendToCosmosTimeout),
  ]);

  const mappedAddress = JSON.parse(
    await processRunGetOutput('grpcurl', [
      '-plaintext',
      '-d',
      `{"address":"${tokenOneAddress}"}`,
      'localhost:9090',
      'aiax.v1.Query/ERC20Address',
    ])
  )['address'];
  assert.equal(typeof mappedAddress, 'string');

  const name = (
    await processRunGetOutput('eth', [
      'contract:call',
      '--network=http://localhost:9545',
      `erc20@${mappedAddress}`,
      'name()',
    ])
  ).trim();
  assert.equal(name, `aiax/${tokenOneAddress}`);

  const balanace = (
    await processRunGetOutput('eth', [
      'contract:call',
      '--network=http://localhost:9545',
      `erc20@${mappedAddress}`,
      `balanceOf("${ethAddress}")`,
    ])
  ).trim();
  assert.equal(balanace, '10');
  console.log(colors.cyan('* Test send external erc20 token to aiax... Done.'));
}

async function testSendAiaxTokenToNative() {
  console.log(colors.cyan('* Test send erc20 Aiax staking token to aiax...'));
  currentReciever = (await aiaxKeyEnsure('testSendAiaxTokenToNative')).address;
  const ethAddress = (await aiaxKeyParse(currentReciever))[0];

  const code = await new ProcessWrapper(path.join(env.binRoot, 'gorc'), [
    '-c',
    path.join(env.configRoot, 'gorc.toml'),
    'eth-to-cosmos',
    aiaxTokenAddress,
    'acc2',
    '0xC469e7aE4aD962c30c7111dc580B4adbc7E914DD',
    ethAddress.substring(2),
    '10',
    '1',
  ]).completion;
  assert.equal(code, 0, 'Send to cosmos exit code');

  await procByTag('aiax').waitForEvent('minted10aiax', sendToCosmosTimeout);

  const balance = JSON.parse(
    await processRunGetOutput('grpcurl', [
      '-plaintext',
      '-d',
      `{"address":"${currentReciever}","denom":"aiax"}`,
      'localhost:9090',
      'cosmos.bank.v1beta1.Query/Balance',
    ])
  )['balance'];
  assert.equal(typeof balance, 'object');
  assert.equal(balance.denom, 'aiax');
  assert.equal(balance.amount, '10');

  console.log(colors.cyan('* Test send erc20 Aiax staking token to aiax... Done.'));
}

async function doTests() {
  await testSendExternalTokenToAiax();
  await testSendAiaxTokenToNative();
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

    code = await deployEthereumContracts().completion;
    if (code !== 0) {
      return Promise.reject('Failed to deploy ethereum contracts');
    } else {
      console.log(colors.green('* Ethereum contracts deployed'));
    }

    console.log(colors.green('* Orchestrator starting...'));
    await orchestratorRun().waitForEvent('started');
    console.log(colors.green('* Orchestrator online'));

    await doTests();

    //await procs[procs.length - 1].completion;
  } finally {
    await teardown().catch((e) => console.error(e));
  }
  console.log(colors.green('* Done'));
}

function fallThroughArgs(): string[] {
  const args = ['-r', env.aiaxRoot];
  if (env.verbose) {
    args.push('-v');
  }
  return args;
}

async function teardown() {
  console.log(colors.yellow('* Teardown...'));
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

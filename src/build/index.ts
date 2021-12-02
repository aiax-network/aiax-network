import * as fs from 'fs';
import * as path from 'path';

import env from '../env';
import type { Command } from 'commander';
import { cloneDeep, gitHash, goPkgVersion, hasElement, processRun } from '../utils';

export interface ArgsBuildOpts {
  output?: string;
  version?: string;
  githash?: string;
  args?: string[];
}

export interface GoBuildOpts extends ArgsBuildOpts {
  tags?: string[];
  ldflags?: string[];
}

export interface BuildOptions {
  debug?: boolean;
  targetRoot?: string;
  binariesDir?: string;
  node?: GoBuildOpts;
  gravity?: ArgsBuildOpts; ///< Orcherstrator
}

async function gravityBridgeBuild(opts: BuildOptions): Promise<any> {
  console.log('build | Building aiax orchestrator engine binary, it may take a while...');
  const args = ['install', '--locked', '--no-track', '--force', '--root', opts.targetRoot, '--path', './gorc'];
  if (opts.debug) {
    args.push('--debug');
  }
  if (!env.verbose) {
    args.push('--quiet');
  }
  await processRun('cargo', args, { cwd: path.resolve(env.gravityRoot, 'orchestrator') });
  console.log(`build | Created ${path.resolve(opts.targetRoot, 'bin', 'gorc')}`);
}

async function aiaxNodeBuild(opts: BuildOptions): Promise<any> {
  console.log('build | Building aiax node binary');
  const o = opts.node;
  if (o.version == null) {
    o.version = env.version;
  }
  if (o.githash == null) {
    o.githash = await gitHash(env.nodeRoot);
  }
  const tags = (o.tags = o.tags || []);
  ['netgo', 'ledger'].forEach((t) => {
    if (!hasElement(tags, t)) {
      tags.push(t);
    }
  });
  const ldflags = (o.ldflags = o.ldflags || []);
  if (!opts.debug) {
    ldflags.push('-s', '-w');
  }
  [
    `-X github.com/cosmos/cosmos-sdk/version.Name=aiax`,
    `-X github.com/cosmos/cosmos-sdk/version.AppName=aiax`,
    `-X github.com/cosmos/cosmos-sdk/version.Version=${env.version}`,
    `-X github.com/cosmos/cosmos-sdk/version.Commit=${o.githash}`,
    `-X github.com/cosmos/cosmos-sdk/version.BuildTags=${tags.join(',')}`,
    `-X github.com/aiax-network/aiax-node/app.DefaultNodeHome=${opts.targetRoot}`,
    `-X github.com/tendermint/tendermint/version.TMCoreSemVer=${await goPkgVersion(
      'github.com/tendermint/tendermint',
      env.nodeRoot
    )}`,
  ].forEach((f) => {
    if (!hasElement(ldflags, f)) {
      ldflags.push(f);
    }
  });
  const args = (o.args = o.args || []);
  args.push('build');
  if (!opts.debug) {
    args.push('-trimpath');
  } else {
    args.push('-gcflags', 'all=-N -l');
  }
  const binary = path.resolve(opts.targetRoot, 'bin/aiax');
  args.push('-tags', tags.join(' '), '-ldflags', ldflags.join(' '), '-o', binary, './cmd/aiaxd');
  await processRun('go', args, { cwd: env.nodeRoot });
  console.log(`build | Created ${binary}`);
}

function createBuildOptions(opts: BuildOptions): BuildOptions {
  const o = cloneDeep(opts);
  if (o.targetRoot == null) {
    o.targetRoot = env.aiaxRoot;
  }
  o.binariesDir = path.resolve(o.targetRoot, 'bin');
  if (o.node == null) {
    o.node = {
      output: path.resolve(o.binariesDir, 'aiax'),
    };
  }
  if (o.gravity == null) {
    o.gravity = {
      output: path.resolve(o.binariesDir, 'gorc'),
    };
  }
  return o;
}

async function buildCheck(opts: BuildOptions) {
  [opts.node.output, opts.gravity.output].forEach((p) => {
    if (!fs.existsSync(p)) {
      throw new Error(`Missing required binary artifact: ${p}`);
    }
  });
}

async function build(opts_: BuildOptions): Promise<BuildOptions> {
  console.log(`build | Building aiax network artifacts... Debug: ${!!opts_.debug ? 'yes' : 'no'}`);
  const opts = createBuildOptions(opts_);
  const bin = path.resolve(opts.targetRoot, 'bin');
  fs.mkdirSync(bin, {
    mode: env.dirMode,
    recursive: true,
  });

  await Promise.all([aiaxNodeBuild(opts), gravityBridgeBuild(opts)]);
  await buildCheck(opts);
  return opts;
}

export async function buildEnsureBinaries(opts_?: BuildOptions): Promise<BuildOptions> {
  const opts = createBuildOptions(opts_ || {});
  try {
    await buildCheck(opts);
    return opts;
  } catch (e) {
    return build(opts);
  }
}

function command(program: Command) {
  program
    .command('build')
    .description('Build node binary artifacts')
    .option('-d, --debug', 'Build debug versions of binary artifacts', false)
    .action((opts) => {
      build({
        debug: !!opts.debug,
      });
    });
}

export default command;

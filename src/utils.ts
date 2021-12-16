import fs from 'fs';
import childProcess from 'child_process';

import rfdc from 'rfdc';
import type { Writable } from 'stream';

import env from './env';
import { promisify } from 'util';

const jptr = require('json8-pointer');

export const cloneDeep = rfdc();

export function setJsonPath(obj: any, path: string, key: string, val: any) {
  const v = jptr.find(obj, path);
  if (v != null) {
    v[key] = val;
  }
}

export function getJsonPath(obj: any, path: string): any {
  return jptr.find(obj, path);
}

export async function valueOrFile(val: string): Promise<string> {
  if (val.charAt(0) === '@') {
    return promisify(fs.readFile)(val.substring(1)).then((v) => v.toString('utf8'));
  } else {
    return val;
  }
}

export function gitHash(cwd?: string): Promise<string> {
  return processRunGetOutput('git', ['log', '-1', '--format=%H'], { cwd }).then((s) => s.trim());
}

export function goPkgVersion(pkg: string, cwd?: string): Promise<string> {
  return processRunGetOutput('go', ['list', '-m', pkg], { cwd }).then((line) => {
    return line.split(/\s/)[1].trim();
  });
}

export function hasElement<T>(arr: T[], el: T): boolean {
  return arr.indexOf(el) !== -1;
}

export interface RunProcessOpts {
  cwd?: string;
  quietOnError?: boolean;
  onStdout?: (data: any) => any;
  onStderr?: (data: any) => any;
}

export function createPrefixOutput(prefix: string, ws: Writable) {
  return function (data: any) {
    ws.write([prefix, data].join());
  };
}

export function processRun(cmd: string, args?: string[], opts?: RunProcessOpts): Promise<any> {
  args = args || [];
  opts = opts || {};
  if (env.verbose) {
    console.log(`${cmd} ${args.join(' ')}`);
  }
  const stdio = ['ignore', opts.onStdout ? 'pipe' : process.stdout, opts.onStderr ? 'pipe' : process.stderr] as any;
  const proc = childProcess.spawn(cmd, args, {
    stdio,
    cwd: opts.cwd,
  });
  if (opts.onStdout) {
    proc.stdout.on('data', opts.onStdout);
  }
  if (opts.onStderr) {
    proc.stderr.on('data', opts.onStderr);
  }
  return awaitProcess(proc);
}

export function processRunGetOutput(cmd: string, args?: string[], opts?: RunProcessOpts): Promise<string> {
  const res = <any[]>[];
  args = args || [];
  opts = opts || {};
  if (env.verbose) {
    console.log(`${cmd} ${args.join(' ')}`);
  }
  const proc = childProcess.spawn(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: opts.cwd,
  });
  proc.stdout.on('data', (data: any) => res.push(data));
  proc.stderr.on('data', (data: any) => res.push(data));
  return awaitProcess(proc)
    .then(() => {
      return res.join('');
    })
    .catch((err) => {
      if (!opts.quietOnError) {
        console.error(`Process output:\n${res.join(' ')}`);
      }
      return Promise.reject(err);
    });
}

export function awaitProcess(process: any) {
  return new Promise((resolve, reject) => {
    process.once('exit', (code: any) => {
      if (code === 0) {
        resolve(undefined);
      } else {
        reject(new Error('Exit with error code: ' + code));
      }
    });
    process.once('error', (err: any) => reject(err));
  });
}

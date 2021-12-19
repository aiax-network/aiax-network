import childProcess, { ChildProcess } from 'child_process';
import mitt, { Emitter } from 'mitt';
import { Writable } from 'stream';
import env from './env';

export interface ProcessWrapperOptions {
  tag?: string;
  cwd?: string;
  onStdout?: (data: any, emitter: Emitter<any>) => any;
  onStderr?: (data: any, emitter: Emitter<any>) => any;
  killIfNoEvents?: { event: string; timeout: number }[];
}

type ResolveFn = (arg?: any) => void;
type RejectFn = ResolveFn;
type ResolveReject = [ResolveFn, RejectFn];

export class ProcessWrapper {
  readonly tag: string;

  readonly events = mitt();

  readonly completion: Promise<number>;

  readonly proc: ChildProcess;

  completed?: number;

  private noEvents = new Set<string>();

  private eventWaiters = new Map<string, ResolveReject[]>();

  constructor(cmd: string, args: string[] = [], opts: ProcessWrapperOptions = {}) {
    this.tag = opts.tag != null ? opts.tag : cmd;
    const stdio = ['ignore', opts.onStdout ? 'pipe' : process.stdout, opts.onStderr ? 'pipe' : process.stderr] as any;
    const proc = (this.proc = childProcess.spawn(cmd, args, {
      stdio,
      cwd: opts.cwd,
    }));
    if (opts.onStdout) {
      proc.stdout.on('data', (data) => {
        opts.onStdout(data, this.events);
      });
    }
    if (opts.onStderr) {
      proc.stderr.on('data', (data) => {
        opts.onStderr(data, this.events);
      });
    }
    this.completion = new Promise((resolve) => {
      if (proc.exitCode != null) {
        this.completed = proc.exitCode;
        this.abortEventWaiters();
        resolve(this.completed);
      } else {
        proc.once('exit', (code) => {
          this.completed = code != null ? code : -1;
          this.abortEventWaiters();
          resolve(this.completed);
        });
        proc.once('error', () => {
          this.completed = -1;
          this.abortEventWaiters();
          resolve(this.completed);
        });
      }
    });

    if (opts.killIfNoEvents) {
      opts.killIfNoEvents.forEach((ne) => this.registerKillNoEvent(ne.event, ne.timeout));
      this.events.on('*', (type) => {
        type = type.toString();
        this.noEvents.delete(type);
        const ew = this.eventWaiters.get(type);
        if (ew) {
          this.eventWaiters.delete(type);
          ew.forEach((r) => r[0]());
        }
      });
    }
  }

  private registerKillNoEvent(event: string, timeout: number) {
    if (this.noEvents.has(event)) {
      return;
    }
    this.noEvents.add(event);
    setTimeout(() => {
      if (this.noEvents.has(event)) {
        console.warn(`Killing ${this.tag}:${this.proc.pid} due to absence of ${event} event`);
        this.kill();
      }
    }, timeout);
  }

  private abortEventWaiters() {
    for (const [_, v] of this.eventWaiters) {
      v.forEach((r) => r[1]('process is not active'));
    }
    this.eventWaiters.clear();
  }

  waitForEvent(event: string): Promise<void> {
    if (this.completed !== undefined) {
      return Promise.reject('process is not active');
    }
    return new Promise((resolve, reject) => {
      let entry = this.eventWaiters.get(event);
      if (entry == null) {
        entry = [[resolve, reject]];
        this.eventWaiters.set(event, entry);
      } else {
        entry.push([resolve, reject]);
      }
    });
  }

  kill(signal: NodeJS.Signals = 'SIGINT', timeout = 3000, hardsignal: NodeJS.Signals = 'SIGKILL'): Promise<number> {
    if (this.completed !== undefined) {
      return Promise.resolve(this.completed);
    }
    this.proc.kill(signal);
    if (timeout > 0) {
      setTimeout(() => {
        if (this.completed === undefined) {
          console.warn(`Killing ${this.tag}${this.proc.pid} by hard kill signal ${hardsignal}`);
          this.proc.kill(hardsignal);
        }
      }, timeout);
    }
    return this.completion;
  }
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

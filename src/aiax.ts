import * as path from 'path';
import env from './env';
import {tomlApply} from './toml';
import { processRun, processRunGetOutput, RunProcessOpts } from './proc';

export async function aiaxConfigApply(apply: any) {
  await tomlApply(path.resolve(env.configRoot, 'app.toml'), apply);
}

export function aiaxRun(args: string[], opts?: RunProcessOpts): Promise<any> {
  opts = opts || {};
  const bin = path.resolve(env.binRoot, 'aiax');
  return processRun(bin, args, { cwd: env.aiaxRoot, ...opts });
}

export function aiaxRunGetOutput(args: string[], opts?: RunProcessOpts): Promise<string> {
  opts = opts || {};
  const bin = path.resolve(env.binRoot, 'aiax');
  return processRunGetOutput(bin, args, { cwd: env.aiaxRoot, ...opts });
}

export async function aiaxKeyEnsure(name: string, backend = 'test'): Promise<CosmosKey> {
  const ret = { name } as CosmosKey;
  let key = JSON.parse(await aiaxRunGetOutput(['keys', 'list', '--output', 'json'])).filter((o) => o.name === name)[0];
  if (key == null) {
    key = JSON.parse(await aiaxRunGetOutput(['keys', 'add', name, '--output', 'json', '--keyring-backend', backend]));
  }
  ret.address = key.address;
  ret.mnemonic = key.mnemonic;
  return ret;
}

export async function aiaxKeyParse(value: string): Promise<ParsedKey> {
  const data = JSON.parse(await aiaxRunGetOutput(['keys', 'parse', value, '--output', 'json']));
  if (typeof data.bytes === 'string') {
    return ['0x' + data.bytes];
  } else if (Array.isArray(data.formats)) {
    return [...data.formats];
  } else {
    return Promise.reject('Unexpected response');
  }
}


export async function aiaxKeyGetBechAddress(name: string, bech: KeyBech, backend = 'test'): Promise<string> {
  const key = JSON.parse(await aiaxRunGetOutput(['keys', 'show', name, '--bech', bech, '--output', 'json']));
  return key.address;
}

export async function aiaxKeyEthAdd(): Promise<EthKey> {
  const ret = {} as EthKey;
  const out = await aiaxRunGetOutput(['eth_keys', 'add']);
  out.split('\n').forEach((l) => {
    l = l.trim();
    if (l.length == 0) {
      return;
    }
    if (l.startsWith('private:')) {
      ret.private = l.substring('private:'.length).trim();
    } else if (l.startsWith('public:')) {
      ret.public = l.substring('public:'.length).trim();
    } else if (l.startsWith('address:')) {
      ret.address = l.substring('address:'.length).trim();
    }
  });
  if (typeof ret.address !== 'string') {
    return Promise.reject('Unexpected input: ' + out);
  }
  return ret;
}

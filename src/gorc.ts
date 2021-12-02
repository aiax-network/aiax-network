import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import env from './env';
import { processRun, processRunGetOutput, RunProcessOpts } from './utils';
import {tomlApply} from './toml';

const fsStat = promisify(fs.stat);

export interface Gorc {
  bin: string;
  args: string[];
}

export function gorcConfigTemplate(): string {
  return `
keystore = "${env.aiaxRoot}"

[gravity]
contract = ""
fees_denom = "aaiax"

[ethereum]
key_derivation_path = "m/44'/60'/0'/0/0"
rpc = "http://localhost:8545"

[cosmos]
grpc = "http://localhost:9090"
key_derivation_path = "m/44'/118'/0'/0/0"
prefix = "aiax"
gas_price = { amount = 1000, denom = "aaiax" }
`.trim();
}

export async function gorcConfigApply(apply: any) {
  await gorcCheck([]);
  await tomlApply(path.resolve(env.configRoot, 'gorc.toml'), apply);
}

async function gorcCheck(args: string[]): Promise<Gorc> {
  const g = { bin: path.resolve(env.binRoot, 'gorc'), args: [...args] } as Gorc;
  if (args.indexOf('-c') === -1 && args.indexOf('--config') == -1) {
    const cfg = path.join(env.configRoot, 'gorc.toml');
    const stat = await fsStat(cfg).catch(() => null);
    if (stat == null || !stat.isFile()) {
      await promisify(fs.mkdir)(env.configRoot, env.dirMode).catch(() => null);
      await promisify(fs.writeFile)(cfg, gorcConfigTemplate(), {
        mode: env.fileMode,
      });
    }
    g.args.unshift('--config', cfg);
  }
  return g;
}

export async function gorcRun(args: string[], opts?: RunProcessOpts): Promise<any> {
  const g = await gorcCheck(args || []);
  return processRun(g.bin, g.args, { cwd: env.aiaxRoot, ...opts });
}

export async function gorcRunGetOutput(args: string[], opts?: RunProcessOpts): Promise<string> {
  const g = await gorcCheck(args || []);
  return processRunGetOutput(g.bin, g.args, { cwd: env.aiaxRoot, ...opts });
}

export async function gorcEthKeyShow(name: string): Promise<string> {
  const sv = await gorcRunGetOutput(['keys', 'eth', 'show', name], { quietOnError: true }).catch(() => null);
  return sv.trim();
}

export async function gorcKeyEthEnsure(name: string): Promise<EthKey> {
  const k = { name } as EthKey;
  const sv = await gorcRunGetOutput(['keys', 'eth', 'show', name], { quietOnError: true }).catch(() => null);
  if (sv != null) {
    k.address = sv.trim();
    return k;
  }
  let out = (await gorcRunGetOutput(['keys', 'eth', 'add', name])).trim().split('\n');
  k.mnemonic = out.slice(-2)[0].trim();
  k.address = out.slice(-1)[0].trim();
  return k;
}

export async function gorcKeyEnsure(name: string): Promise<CosmosKey> {
  const k = { name } as CosmosKey;
  const sv = await gorcRunGetOutput(['keys', 'cosmos', 'show', name], { quietOnError: true }).catch(() => null);
  if (sv != null) {
    k.address = sv.split(/\s/)[1];
    return k;
  }
  let out = (await gorcRunGetOutput(['keys', 'cosmos', 'add', name])).trim().split('\n');
  k.mnemonic = out.slice(-2)[0].trim();
  k.address = out.slice(-1)[0].split(/\s/)[1].trim();
  return k;
}

export async function gorcSignDelegateKeys(gorcKeyName: string, validatorAddress: string, nonce = 0): Promise<string> {
  return (await gorcRunGetOutput(['sign-delegate-keys', '--args', gorcKeyName, validatorAddress, `${nonce}`])).trim();
}

export async function gorcKeyImport(name: string, pkHex: string, overwrite = false): Promise<string> {
  const args = ['keys', 'eth', 'import', name, pkHex];
  if (overwrite) {
    args.push('--overwrite');
  }
  return (await gorcRunGetOutput(args)).trim();
}

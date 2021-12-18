import fs from 'fs';
import rfdc from 'rfdc';
import { promisify } from 'util';
import { processRunGetOutput } from './proc';

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

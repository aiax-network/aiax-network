import fs from 'fs';
import toml from '@ltd/j-toml';
import { promisify } from 'util';
import mpatch from 'json8-merge-patch';

export async function tomlApply(path: string, mergePatch: any): Promise<any> {
  const data = (await promisify(fs.readFile)(path)).toString();
  const table = toml.parse(data, {
    x: {
      order: true,
      comment: true,
    },
  });
  mpatch.apply(table, mergePatch);
  await promisify(fs.writeFile)(path, toml.stringify(table, { newline: '\n' }));
}

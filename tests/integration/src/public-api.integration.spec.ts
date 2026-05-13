import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const workspaceRoot = join(__dirname, '../../..');
const packagesDir = join(workspaceRoot, 'packages');

const publishablePackages: string[] = readdirSync(packagesDir)
  .filter((dir) => existsSync(join(packagesDir, dir, 'package.json')))
  .map((dir) => JSON.parse(readFileSync(join(packagesDir, dir, 'package.json'), 'utf-8')))
  .filter((pkg) => pkg.publishConfig?.access === 'public' && pkg.name !== '@rule-io/cli')
  .map((pkg) => pkg.name as string);

describe('public package entrypoints', () => {
  it.each(publishablePackages)('%s loads without error', async (pkgName) => {
    const mod = await import(pkgName);

    expect(mod).toBeDefined();
  });
});

/**
 * Load `.env` from the current working directory into `process.env`.
 *
 * Minimal, zero-dep replacement for `dotenv`. Values already present in the
 * environment take precedence. Lines starting with `#` and blank lines are
 * ignored; surrounding single/double quotes are stripped.
 *
 * Called once at CLI startup by `cli.ts` before any subcommand runs.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function loadEnv(cwd: string = process.cwd()): void {
  const envPath = join(cwd, '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

/**
 * Throw with a helpful error if the given environment variable is missing.
 *
 * Subcommands that need a specific variable (e.g. `RULE_API_KEY`) should call
 * this at the top of their `run()` handler rather than dereferencing the env
 * directly. Keeps failure messages consistent across commands.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} in environment or .env. Set it in your shell or add it to a .env file in the current directory.`,
    );
  }
  return value;
}

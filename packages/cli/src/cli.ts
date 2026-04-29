#!/usr/bin/env node

/**
 * @rule-io/cli entry point.
 *
 * Registers each subcommand against a top-level `rule-io` program, loads
 * environment variables from `.env` in the current working directory, then
 * dispatches based on argv.
 */

import { Command } from 'commander';
import { loadEnv } from './shared/env.js';
import { registerDeploy } from './commands/deploy.js';
import { registerListAutomations } from './commands/list-automations.js';
import { registerValidateRcml } from './commands/validate-rcml.js';
import { registerCloneEmail } from './commands/clone-email.js';
import { registerInspect } from './commands/inspect.js';

loadEnv();

const program = new Command();

program
  .name('rule-io')
  .description('Command-line tools for the Rule.io SDK — deploy vendor presets, validate RCML, inspect automations.')
  .version('0.3.0');

registerDeploy(program);
registerListAutomations(program);
registerValidateRcml(program);
registerCloneEmail(program);
registerInspect(program);

try {
  await program.parseAsync(process.argv);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exit(1);
}

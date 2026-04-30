/**
 * `rule-io deploy …` — vendor preset deployment subcommand group.
 *
 * Wires individual vendor deploy commands as subcommands under `deploy`.
 * Each vendor's logic lives in its own sibling module; this file exists
 * only to register them as children of a shared `deploy` Command.
 */

import type { Command } from 'commander';
import { registerDeployShopify } from './deploy-shopify.js';
import { registerDeployBookzen } from './deploy-bookzen.js';
import { registerDeploySamfora } from './deploy-samfora.js';

export function registerDeploy(program: Command): void {
  const deploy = program
    .command('deploy')
    .description('Deploy vendor preset automations into a Rule.io account.');

  registerDeployShopify(deploy);
  registerDeployBookzen(deploy);
  registerDeploySamfora(deploy);
}

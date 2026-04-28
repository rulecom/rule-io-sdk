/**
 * Shared `RuleClient` factory for CLI subcommands.
 *
 * Reads `RULE_API_KEY` from the environment (populated by `loadEnv()`) or
 * accepts an explicit override from a subcommand's `--api-key` flag.
 */

import { RuleClient } from '@rule-io/client';
import { requireEnv } from './env.js';

export interface ClientOptions {
  apiKey?: string;
}

export function createClient(opts: ClientOptions = {}): RuleClient {
  const apiKey = opts.apiKey ?? requireEnv('RULE_API_KEY');
  return new RuleClient({ apiKey });
}

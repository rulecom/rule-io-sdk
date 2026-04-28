import { describe, it, expect } from 'vitest';
import { loadEnv, requireEnv } from '../src/shared/env.js';

describe('@rule-io/cli shared env', () => {
  it('loadEnv is a no-op when .env is absent', () => {
    expect(() => loadEnv('/tmp/__definitely-not-a-real-dir-for-rule-io-cli-tests__')).not.toThrow();
  });

  it('requireEnv throws a helpful error when the variable is missing', () => {
    delete process.env['__RULE_IO_CLI_TEST_MISSING__'];
    expect(() => requireEnv('__RULE_IO_CLI_TEST_MISSING__')).toThrow(
      /Missing __RULE_IO_CLI_TEST_MISSING__/,
    );
  });

  it('requireEnv returns the value when present', () => {
    process.env['__RULE_IO_CLI_TEST_PRESENT__'] = 'hello';
    expect(requireEnv('__RULE_IO_CLI_TEST_PRESENT__')).toBe('hello');
    delete process.env['__RULE_IO_CLI_TEST_PRESENT__'];
  });
});

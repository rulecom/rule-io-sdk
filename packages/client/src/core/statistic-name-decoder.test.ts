import { describe, expect, it } from 'vitest';

import { encodeBase64Utf8 } from './base64.js';
import { decodeStatisticMessageName } from './statistic-name-decoder.js';

describe('decodeStatisticMessageName', () => {
  it('decodes message names that are canonical base64 of valid UTF-8', () => {
    const original = encodeBase64Utf8('Welcome — newsletter');
    const record = {
      object: { type: 'message', name: original },
      other: 'untouched',
    };

    const result = decodeStatisticMessageName(record);

    expect(result.object.name).toBe('Welcome — newsletter');
    expect(result.other).toBe('untouched');
  });

  it('passes through non-message records unchanged', () => {
    const record = { object: { type: 'campaign', name: 'aGVsbG8=' } };

    expect(decodeStatisticMessageName(record)).toBe(record);
  });

  it('passes through values that fail base64 decode', () => {
    const record = { object: { type: 'message', name: 'not!base64!' } };

    expect(decodeStatisticMessageName(record)).toBe(record);
  });

  it("passes through values whose decode does not round-trip back to the original", () => {
    // Re-encoding "Hello" gives "SGVsbG8=" with padding. Without the trailing
    // '=' the round-trip guard rejects it as non-canonical.
    const record = { object: { type: 'message', name: 'SGVsbG8' } };

    expect(decodeStatisticMessageName(record)).toBe(record);
  });

  it('does not mutate the input record', () => {
    const original = encodeBase64Utf8('hi');
    const record = { object: { type: 'message', name: original } };
    const before = JSON.stringify(record);

    decodeStatisticMessageName(record);

    expect(JSON.stringify(record)).toBe(before);
  });
});

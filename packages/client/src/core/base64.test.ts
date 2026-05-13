import { describe, expect, it } from 'vitest';

import { encodeBase64Utf8, tryDecodeBase64Utf8 } from './base64.js';

describe('encodeBase64Utf8 / tryDecodeBase64Utf8', () => {
  it('round-trips ASCII', () => {
    const enc = encodeBase64Utf8('hello world');

    expect(enc).toBe('aGVsbG8gd29ybGQ=');
    expect(tryDecodeBase64Utf8(enc)).toBe('hello world');
  });

  it('round-trips multibyte UTF-8', () => {
    const enc = encodeBase64Utf8('héllo — 你好');

    expect(tryDecodeBase64Utf8(enc)).toBe('héllo — 你好');
  });

  it('round-trips a long string without stack overflow', () => {
    const long = 'a'.repeat(200_000);
    const enc = encodeBase64Utf8(long);

    expect(tryDecodeBase64Utf8(enc)).toBe(long);
  });

  it('returns null for empty input', () => {
    expect(tryDecodeBase64Utf8('')).toBeNull();
  });

  it('returns null for non-base64 input', () => {
    expect(tryDecodeBase64Utf8('not!base64!')).toBeNull();
  });

  it('returns null when decoded bytes are not valid UTF-8', () => {
    // 0xff alone is not a valid UTF-8 start byte.
    const invalidUtf8 = btoa(String.fromCharCode(0xff));

    expect(tryDecodeBase64Utf8(invalidUtf8)).toBeNull();
  });
});

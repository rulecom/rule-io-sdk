/**
 * Base64 ↔ UTF-8 helpers used by the export-statistics decoder.
 *
 * Uses platform-native `atob` / `btoa` + `TextEncoder` / `TextDecoder` so we
 * do not depend on Node's `Buffer` (the client runs in Node 20+ and modern
 * browser/edge runtimes).
 */

const UTF8_ENCODER = new TextEncoder();
const UTF8_DECODER_FATAL = new TextDecoder('utf-8', { fatal: true });

// `String.fromCharCode(...bytes)` blows the JS call stack for very long
// inputs. Process in chunks for bounded stack usage and amortized linear
// concatenation cost.
const BYTE_TO_CHAR_CHUNK = 0x8000;

/**
 * Decode a base64 string to UTF-8, or return null if the input is not valid
 * base64 or the decoded bytes are not valid UTF-8.
 */
export function tryDecodeBase64Utf8(input: string): string | null {
  if (!input) return null;

  try {
    const binary = atob(input);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return UTF8_DECODER_FATAL.decode(bytes);
  } catch {
    return null;
  }
}

/** Encode a UTF-8 string to canonical (padded) base64. */
export function encodeBase64Utf8(input: string): string {
  const bytes = UTF8_ENCODER.encode(input);
  let binary = '';

  for (let i = 0; i < bytes.length; i += BYTE_TO_CHAR_CHUNK) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + BYTE_TO_CHAR_CHUNK)
    );
  }

  return btoa(binary);
}

/**
 * Rule.io returns `object.name` base64-encoded on statistics export records
 * where `object.type === 'message'`. Every other object type returns plain
 * text. See GitHub issue #95.
 *
 * {@link decodeStatisticMessageName} decodes the name and then re-encodes the
 * decoded value to check that it matches the original exactly. Inputs that
 * don't cleanly round-trip are left untouched, so any value that's not
 * canonical base64 passes through as-is. The guard does NOT distinguish an
 * intentionally base64-encoded name from a plain-text name that also happens
 * to be valid base64 (e.g. `"aGVsbG8="`) — such values will still be decoded.
 * Consumers who need to preserve raw API output should opt out via the
 * `decodeNames: false` flag on `exports.statistics()`.
 */

import { encodeBase64Utf8, tryDecodeBase64Utf8 } from './base64.js';

/** Minimal shape needed for the round-trip guard. */
interface DecodableStatisticRecord {
  object: { type: string; name: string };
}

export function decodeStatisticMessageName<T extends DecodableStatisticRecord>(
  record: T
): T {
  if (record.object.type !== 'message') return record;
  const original = record.object.name;
  const decoded = tryDecodeBase64Utf8(original);

  if (decoded === null) return record;
  if (encodeBase64Utf8(decoded) !== original) return record;

  return { ...record, object: { ...record.object, name: decoded } };
}

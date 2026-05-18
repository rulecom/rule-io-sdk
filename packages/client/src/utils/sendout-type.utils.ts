import type { RuleSendoutType } from '../resources/automations/automations.types.js';

export function toNumericSendout(v: unknown): RuleSendoutType | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v as RuleSendoutType;

  if (v != null && typeof v === 'object' && 'value' in v) {
    const val = (v as { value: unknown }).value;

    if (typeof val === 'number' && Number.isFinite(val)) return val as RuleSendoutType;
  }

  return undefined;
}

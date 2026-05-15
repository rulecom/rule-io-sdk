import type { RuleSendoutType } from '../resources/automations/automations.types.js';

export function toNumericSendout(v: unknown): RuleSendoutType | undefined {
  if (typeof v === 'number') return v as RuleSendoutType;

  if (v != null && typeof v === 'object' && 'value' in v) {
    const val = (v as { value: unknown }).value;

    if (typeof val === 'number') return val as RuleSendoutType;
  }

  return undefined;
}

import { describe, expect, it } from 'vitest'

import { customField, loopValue } from './factories.js'
import {
  defaultTemplateRefSerializer,
  isTemplateRef,
  serializeRef,
} from './serializer.js'

describe('factories', () => {
  it('customField without id', () => {
    expect(customField('Subscriber', 'FirstName')).toEqual({
      kind: 'custom-field',
      group: 'Subscriber',
      name: 'FirstName',
    })
  })

  it('customField with numeric id', () => {
    expect(customField('Subscriber', 'FirstName', 200001)).toEqual({
      kind: 'custom-field',
      group: 'Subscriber',
      name: 'FirstName',
      id: 200001,
    })
  })

  it('loopValue', () => {
    expect(loopValue('name')).toEqual({ kind: 'loop-value', key: 'name' })
  })
})

describe('isTemplateRef', () => {
  it('narrows CustomFieldRef / LoopValueRef', () => {
    expect(isTemplateRef(customField('g', 'n'))).toBe(true)
    expect(isTemplateRef(loopValue('k'))).toBe(true)
  })

  it('rejects plain objects', () => {
    expect(isTemplateRef({})).toBe(false)
    expect(isTemplateRef({ kind: 'other' })).toBe(false)
    expect(isTemplateRef({ group: 'x', name: 'y' })).toBe(false)
  })

  it('rejects primitives and null/undefined', () => {
    expect(isTemplateRef(null)).toBe(false)
    expect(isTemplateRef(undefined)).toBe(false)
    expect(isTemplateRef('::placeholder{…}')).toBe(false)
    expect(isTemplateRef(42)).toBe(false)
    expect(isTemplateRef(true)).toBe(false)
  })
})

describe('defaultTemplateRefSerializer — custom-field', () => {
  it('produces the canonical RFM placeholder string', () => {
    expect(
      defaultTemplateRefSerializer.serializeCustomField(
        customField('Subscriber', 'FirstName', 200001),
      ),
    ).toBe(
      '::placeholder{type="CustomField" name="Subscriber.FirstName" value="200001" original="[CustomField:200001]"}',
    )
  })

  it('coerces a string id to the exact text representation', () => {
    expect(
      defaultTemplateRefSerializer.serializeCustomField(
        customField('Order', 'TotalPrice', '200005'),
      ),
    ).toBe(
      '::placeholder{type="CustomField" name="Order.TotalPrice" value="200005" original="[CustomField:200005]"}',
    )
  })

  it('omits the group dot when group is empty', () => {
    expect(
      defaultTemplateRefSerializer.serializeCustomField(
        customField('', 'Bare', 7),
      ),
    ).toBe(
      '::placeholder{type="CustomField" name="Bare" value="7" original="[CustomField:7]"}',
    )
  })

  it('throws when id is missing', () => {
    expect(() =>
      defaultTemplateRefSerializer.serializeCustomField(
        customField('Subscriber', 'FirstName'),
      ),
    ).toThrow(/id is required/)
  })
})

describe('defaultTemplateRefSerializer — loop-value', () => {
  it('produces the canonical loop-value directive with index == key', () => {
    expect(defaultTemplateRefSerializer.serializeLoopValue(loopValue('name'))).toBe(
      '::loop-value{original="[LoopValue:name]" value="name" index="name"}',
    )
    expect(defaultTemplateRefSerializer.serializeLoopValue(loopValue('sku'))).toBe(
      '::loop-value{original="[LoopValue:sku]" value="sku" index="sku"}',
    )
  })
})

describe('serializeRef dispatch', () => {
  it('routes by kind', () => {
    expect(
      serializeRef(customField('G', 'N', 1), defaultTemplateRefSerializer),
    ).toContain('[CustomField:1]')
    expect(
      serializeRef(loopValue('k'), defaultTemplateRefSerializer),
    ).toContain('[LoopValue:k]')
  })

  it('honours a custom serializer', () => {
    const upper = {
      serializeCustomField: (r: { group: string; name: string }) =>
        `CF:${r.group}.${r.name}`.toUpperCase(),
      serializeLoopValue: (r: { key: string }) => `LV:${r.key}`.toUpperCase(),
    }

    expect(serializeRef(customField('sub', 'first'), upper)).toBe('CF:SUB.FIRST')
    expect(serializeRef(loopValue('name'), upper)).toBe('LV:NAME')
  })
})

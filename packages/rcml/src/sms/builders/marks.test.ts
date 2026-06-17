import { describe, it, expect } from 'vitest'
import { createLinkMark } from './marks.js'
import type { SmsLinkMark } from '../content/json-validator/types.js'

describe('createLinkMark', () => {
  it('produces a link mark with the given attributes', () => {
    expect(
      createLinkMark({
        href: 'https://example.com',
        track: true,
        shorten: false,
      }),
    ).toEqual<SmsLinkMark>({
      type: 'link',
      attrs: {
        href: 'https://example.com',
        track: true,
        shorten: false,
      },
    })
  })

  it('preserves the href verbatim, including [Link:…] tokens', () => {
    expect(
      createLinkMark({ href: '[Link:Unsubscribe]', track: false, shorten: false }),
    ).toEqual<SmsLinkMark>({
      type: 'link',
      attrs: {
        href: '[Link:Unsubscribe]',
        track: false,
        shorten: false,
      },
    })
  })

  it('boolean flags are stored as booleans (not stringified)', () => {
    const mark = createLinkMark({
      href: 'https://example.com',
      track: false,
      shorten: true,
    })

    expect(typeof mark.attrs.track).toBe('boolean')
    expect(typeof mark.attrs.shorten).toBe('boolean')
  })
})

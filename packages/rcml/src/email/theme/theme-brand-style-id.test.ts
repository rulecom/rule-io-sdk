import { describe, expect, it } from 'vitest'

import { createEmailTheme } from '../create-theme.js'
import { setBrandStyleId } from './theme-brand-style-id.js'

describe('setBrandStyleId', () => {
  it('sets the id on a fresh theme', () => {
    const theme = setBrandStyleId(createEmailTheme(), 42)

    expect(theme.brandStyleId).toBe(42)
  })

  it('does not mutate the input theme', () => {
    const before = createEmailTheme()
    const after = setBrandStyleId(before, 42)

    expect(before.brandStyleId).toBeUndefined()
    expect(after).not.toBe(before)
  })

  it('overwrites an existing brandStyleId', () => {
    const first = setBrandStyleId(createEmailTheme(), 1)
    const second = setBrandStyleId(first, 2)

    expect(second.brandStyleId).toBe(2)
    expect(first.brandStyleId).toBe(1)
  })

  it('leaves every other field untouched', () => {
    const before = createEmailTheme()
    const after = setBrandStyleId(before, 7)

    expect(after.colors).toBe(before.colors)
    expect(after.links).toBe(before.links)
    expect(after.images).toBe(before.images)
    expect(after.fonts).toBe(before.fonts)
    expect(after.fontStyles).toBe(before.fontStyles)
  })
})

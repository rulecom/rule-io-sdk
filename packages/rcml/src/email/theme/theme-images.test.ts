import { describe, expect, it } from 'vitest'

import { createEmailTheme } from '../create-theme.js'
import { EmailThemeImageType } from '../theme-types.js'
import { replaceImages } from './theme-images.js'

describe('replaceImages', () => {
  it('replaces the images map with the provided entries', () => {
    const theme = replaceImages(createEmailTheme(), [
      { type: EmailThemeImageType.Logo, url: 'https://example.com/logo.png' },
    ])

    expect(theme.images[EmailThemeImageType.Logo]?.url).toBe(
      'https://example.com/logo.png'
    )
  })

  it('an empty array clears all images', () => {
    const seeded = replaceImages(createEmailTheme(), [
      { type: EmailThemeImageType.Logo, url: 'https://example.com/logo.png' },
    ])
    const cleared = replaceImages(seeded, [])

    expect(cleared.images).toEqual({})
  })

  it('does not mutate the input theme', () => {
    const before = createEmailTheme()
    const after = replaceImages(before, [
      { type: EmailThemeImageType.Logo, url: 'https://example.com/logo.png' },
    ])

    expect(before.images).not.toBe(after.images)
    expect(before.images).toEqual({})
  })

  it('silently drops entries with an unknown image type', () => {
    const theme = replaceImages(createEmailTheme(), [
      // @ts-expect-error — runtime validation ignores unknown types
      { type: 'banner', url: 'https://example.com/banner.png' },
      { type: EmailThemeImageType.Logo, url: 'https://example.com/logo.png' },
    ])

    expect(theme.images).toEqual({
      [EmailThemeImageType.Logo]: {
        type: EmailThemeImageType.Logo,
        url: 'https://example.com/logo.png',
      },
    })
  })
})

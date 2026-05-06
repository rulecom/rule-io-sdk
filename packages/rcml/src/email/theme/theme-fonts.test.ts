import { describe, expect, it } from 'vitest'

import { createEmailTheme } from '../create-theme.js'
import { replaceFonts } from './theme-fonts.js'

describe('replaceFonts', () => {
  it('replaces the fonts array with the provided entries', () => {
    const theme = replaceFonts(createEmailTheme(), [
      { fontFamily: 'Merriweather', url: 'https://fonts.example/m.css' },
    ])

    expect(theme.fonts).toEqual([
      { fontFamily: 'Merriweather', url: 'https://fonts.example/m.css' },
    ])
  })

  it('accepts fonts without a URL (system fonts)', () => {
    const theme = replaceFonts(createEmailTheme(), [{ fontFamily: 'Helvetica' }])

    expect(theme.fonts).toEqual([{ fontFamily: 'Helvetica' }])
  })

  it('an empty array clears the list', () => {
    const seeded = replaceFonts(createEmailTheme(), [
      { fontFamily: 'Merriweather', url: 'https://fonts.example/m.css' },
    ])
    const cleared = replaceFonts(seeded, [])

    expect(cleared.fonts).toEqual([])
  })

  it('does not alias the input (later mutation of the source is safe)', () => {
    const fonts = [{ fontFamily: 'Merriweather', url: 'https://fonts.example/m.css' }]
    const theme = replaceFonts(createEmailTheme(), fonts)

    fonts[0]!.fontFamily = 'Other'

    expect(theme.fonts[0]!.fontFamily).toBe('Merriweather')
  })

  it('does not mutate the input theme', () => {
    const before = createEmailTheme()
    const after = replaceFonts(before, [{ fontFamily: 'X', url: 'https://x.example/x.css' }])

    expect(before.fonts).not.toBe(after.fonts)
    expect(before.fonts).toEqual([])
  })
})


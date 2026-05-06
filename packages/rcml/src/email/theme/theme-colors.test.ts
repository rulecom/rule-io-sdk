import { describe, expect, it } from 'vitest'

import { createEmailTheme } from '../create-theme.js'
import { DEFAULT_COLORS_MAP } from '../theme-defaults.js'
import { EmailThemeColorType } from '../theme-types.js'
import { resetColorsTo } from './theme-colors.js'

describe('resetColorsTo', () => {
  it('overlays provided entries on top of the defaults', () => {
    const theme = resetColorsTo(createEmailTheme(), [
      { type: EmailThemeColorType.Primary, hex: '#FF0000' },
    ])

    expect(theme.colors[EmailThemeColorType.Primary]?.hex).toBe('#FF0000')
    // Missing slot reverts to the default, not cleared.
    expect(theme.colors[EmailThemeColorType.Body]?.hex).toBe(
      DEFAULT_COLORS_MAP[EmailThemeColorType.Body].hex
    )
  })

  it('ignores unknown color types', () => {
    const theme = resetColorsTo(createEmailTheme(), [
      { type: 'not-a-real-type' as unknown as EmailThemeColorType, hex: '#000000' },
      { type: EmailThemeColorType.Secondary, hex: '#ABCDEF' },
    ])

    expect(theme.colors[EmailThemeColorType.Secondary]?.hex).toBe('#ABCDEF')
  })

  it('does not alias the input (later mutation of the source is safe)', () => {
    const colors = [{ type: EmailThemeColorType.Primary, hex: '#FF0000' }]
    const theme = resetColorsTo(createEmailTheme(), colors)

    colors[0]!.hex = '#000000'

    expect(theme.colors[EmailThemeColorType.Primary]?.hex).toBe('#FF0000')
  })

  it('does not mutate the input theme', () => {
    const before = createEmailTheme()
    const after = resetColorsTo(before, [
      { type: EmailThemeColorType.Primary, hex: '#FF0000' },
    ])

    expect(before.colors).not.toBe(after.colors)
    expect(before.colors[EmailThemeColorType.Primary]?.hex).toBe(
      DEFAULT_COLORS_MAP[EmailThemeColorType.Primary].hex
    )
  })
})

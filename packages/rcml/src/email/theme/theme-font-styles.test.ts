import { describe, expect, it } from 'vitest'

import { createEmailTheme } from '../create-theme.js'
import { DEFAULT_FONT_STYLES_MAP } from '../theme-defaults.js'
import { EmailThemeFontStyleType } from '../theme-types.js'
import { resetFontStylesTo } from './theme-font-styles.js'

describe('resetFontStylesTo', () => {
  it('partial-merges each override into its slot; other slots reset to defaults', () => {
    const theme = resetFontStylesTo(createEmailTheme(), [
      { type: EmailThemeFontStyleType.H1, color: '#333333' },
    ])
    const h1 = theme.fontStyles[EmailThemeFontStyleType.H1]

    expect(h1.color).toBe('#333333')
    // Other fields on H1 keep the H1 defaults.
    expect(h1.fontSize).toBe(DEFAULT_FONT_STYLES_MAP[EmailThemeFontStyleType.H1].fontSize)
    expect(h1.fontWeight).toBe(
      DEFAULT_FONT_STYLES_MAP[EmailThemeFontStyleType.H1].fontWeight
    )
    // Unspecified slots reset to defaults.
    expect(theme.fontStyles[EmailThemeFontStyleType.Paragraph]).toEqual(
      DEFAULT_FONT_STYLES_MAP[EmailThemeFontStyleType.Paragraph]
    )
  })

  it('ignores entries without a type', () => {
    const theme = resetFontStylesTo(createEmailTheme(), [{ color: '#000' }])

    expect(theme.fontStyles[EmailThemeFontStyleType.Paragraph].color).toBe(
      DEFAULT_FONT_STYLES_MAP[EmailThemeFontStyleType.Paragraph].color
    )
  })

  it('ignores entries with an unknown type', () => {
    const theme = resetFontStylesTo(createEmailTheme(), [
      { type: 'not-real' as unknown as EmailThemeFontStyleType, color: '#000' },
      { type: EmailThemeFontStyleType.H2, color: '#ABCDEF' },
    ])

    expect(theme.fontStyles[EmailThemeFontStyleType.H2].color).toBe('#ABCDEF')
  })

  it('does not mutate the input theme', () => {
    const before = createEmailTheme()
    const after = resetFontStylesTo(before, [
      { type: EmailThemeFontStyleType.H1, color: '#333333' },
    ])

    expect(before.fontStyles).not.toBe(after.fontStyles)
    expect(before.fontStyles[EmailThemeFontStyleType.H1].color).toBe(
      DEFAULT_FONT_STYLES_MAP[EmailThemeFontStyleType.H1].color
    )
  })
})

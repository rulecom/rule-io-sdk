import { describe, expect, it } from 'vitest'

import { createEmailTheme } from '../create-theme.js'
import { DEFAULT_LINKS_MAP } from '../theme-defaults.js'
import { resetLinksTo } from './theme-links.js'

describe('resetLinksTo', () => {
  it('overlays provided entries on top of the defaults', () => {
    const theme = resetLinksTo(createEmailTheme(), [
      { type: 'facebook', url: 'https://fb.example/acme' },
    ])

    expect(theme.links.facebook?.url).toBe('https://fb.example/acme')
    // Unspecified slots revert to defaults, not cleared.
    expect(theme.links.instagram?.url).toBe(DEFAULT_LINKS_MAP.instagram.url)
  })

  it('ignores unknown link types', () => {
    const theme = resetLinksTo(createEmailTheme(), [
      { type: 'facebook', url: 'https://fb.example/acme' },
      // @ts-expect-error — runtime validation ignores unknown types
      { type: 'myspace', url: 'https://myspace.example/acme' },
    ])

    expect(theme.links.facebook?.url).toBe('https://fb.example/acme')
    expect(
      Object.values(theme.links).find((l) => (l?.type as string) === 'myspace')
    ).toBeUndefined()
  })

  it('does not alias the input (later mutation of the source is safe)', () => {
    const links = [{ type: 'facebook' as const, url: 'https://fb.example/a' }]
    const theme = resetLinksTo(createEmailTheme(), links)

    links[0]!.url = 'https://fb.example/b'

    expect(theme.links.facebook?.url).toBe('https://fb.example/a')
  })

  it('does not mutate the input theme', () => {
    const before = createEmailTheme()
    const after = resetLinksTo(before, [
      { type: 'facebook', url: 'https://fb.example/acme' },
    ])

    expect(before.links).not.toBe(after.links)
  })
})

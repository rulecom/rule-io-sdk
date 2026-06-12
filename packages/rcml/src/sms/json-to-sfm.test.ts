import { describe, it, expect } from 'vitest'
import { sfmToJson } from './sfm-to-json.js'
import { jsonToSfm } from './json-to-sfm.js'
import type { SmsContentJson } from './content/json-validator/types.js'

describe('jsonToSfm()', () => {
  it('round-trips plain text', () => {
    expect(jsonToSfm(sfmToJson('Hello world'))).toBe('Hello world')
  })

  it('round-trips a placeholder', () => {
    expect(jsonToSfm(sfmToJson('[Subscriber:FirstName]'))).toBe('[Subscriber:FirstName]')
  })

  it('round-trips text + placeholder + text', () => {
    const input = 'Hi [Subscriber:FirstName]!'

    expect(jsonToSfm(sfmToJson(input))).toBe(input)
  })

  it('round-trips single newline as hardbreak', () => {
    expect(jsonToSfm(sfmToJson('Line one\nLine two'))).toBe('Line one\nLine two')
  })

  it('round-trips double newline as paragraph boundary', () => {
    expect(jsonToSfm(sfmToJson('Para one\n\nPara two'))).toBe('Para one\n\nPara two')
  })

  it('renders linked text — drops link mark (lossy)', () => {
    const json: SmsContentJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Click here',
              marks: [{ type: 'link', attrs: { href: 'https://example.com', track: true, shorten: false } }],
            },
          ],
        },
      ],
    }

    // Only text is preserved — link mark is silently dropped
    expect(jsonToSfm(json)).toBe('Click here')
  })

  it('empty paragraph round-trips to empty string', () => {
    expect(jsonToSfm(sfmToJson(''))).toBe('')
  })
})

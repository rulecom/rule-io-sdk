import { describe, expect, it } from 'vitest'
import { validateContent } from './content-validate.js'

/**
 * Unit tests for the ProseMirror content delegator. `validateContent`
 * walks the tree and forwards each text-level node's `content` to
 * `safeParseJson`; the tests here verify the path-prefixing, the
 * per-tag flavor selection, and the defensive shape-checking behaviour.
 */

const VALID_PM_CONTENT = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Hello' }],
    },
  ],
}

describe('validateContent — happy path', () => {
  it('returns no issues when rc-text carries a valid ProseMirror doc', () => {
    const doc = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            {
              tagName: 'rc-section',
              children: [
                {
                  tagName: 'rc-column',
                  children: [{ tagName: 'rc-text', content: VALID_PM_CONTENT }],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(validateContent(doc)).toEqual([])
  })

  it('ignores non-text-carrying tags (e.g. rc-spacer)', () => {
    const doc = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            {
              tagName: 'rc-section',
              children: [
                {
                  tagName: 'rc-column',
                  children: [{ tagName: 'rc-spacer', attributes: { height: '10px' } }],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(validateContent(doc)).toEqual([])
  })
})

describe('validateContent — failure paths', () => {
  it('flags invalid PM content with CONTENT_INVALID and an embedded-path prefix', () => {
    const doc = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            {
              tagName: 'rc-section',
              children: [
                {
                  tagName: 'rc-column',
                  children: [{ tagName: 'rc-text', content: { type: 'not-a-doc' } }],
                },
              ],
            },
          ],
        },
      ],
    }
    const issues = validateContent(doc)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues[0]?.code).toBe('CONTENT_INVALID')
    expect(issues[0]?.path.startsWith('/children/1/children/0/children/0/children/0/content')).toBe(
      true,
    )
  })

  it('uses the inline-RFM flavor for rc-button (rejects block-level content that rc-text would accept)', () => {
    // A ProseMirror doc that's *only* valid in the non-inline flavor:
    // inline-RFM caps doc.content at a single paragraph, so adding a second
    // paragraph must be rejected when the flavor is inline-RFM.
    const multiParagraphContent = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'second' }] },
      ],
    }

    const buttonDoc = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            {
              tagName: 'rc-section',
              children: [
                {
                  tagName: 'rc-column',
                  children: [{ tagName: 'rc-button', content: multiParagraphContent }],
                },
              ],
            },
          ],
        },
      ],
    }

    const textDoc = {
      ...buttonDoc,
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            {
              tagName: 'rc-section',
              children: [
                {
                  tagName: 'rc-column',
                  children: [{ tagName: 'rc-text', content: multiParagraphContent }],
                },
              ],
            },
          ],
        },
      ],
    }

    const buttonIssues = validateContent(buttonDoc)
    const textIssues = validateContent(textDoc)

    expect(buttonIssues.length).toBeGreaterThan(0)
    expect(buttonIssues[0]?.code).toBe('CONTENT_INVALID')
    // rc-text (RFM flavor) permits multi-paragraph content, so no issues.
    expect(textIssues).toEqual([])
  })
})

describe('validateContent — shape defence', () => {
  it('returns an empty list for non-object inputs', () => {
    expect(validateContent(null)).toEqual([])
    expect(validateContent('string')).toEqual([])
    expect(validateContent(42)).toEqual([])
    expect(validateContent([])).toEqual([])
  })

  it('walks into children of non-leaf nodes', () => {
    const doc = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            {
              tagName: 'rc-section',
              children: [
                {
                  tagName: 'rc-column',
                  children: [
                    { tagName: 'rc-text', content: { type: 'not-a-doc' } },
                    { tagName: 'rc-heading', content: { type: 'not-a-doc' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    const issues = validateContent(doc)
    const textIssues = issues.filter((i) => i.path.includes('/children/0/content'))
    const headingIssues = issues.filter((i) => i.path.includes('/children/1/content'))
    expect(textIssues.length).toBeGreaterThan(0)
    expect(headingIssues.length).toBeGreaterThan(0)
  })
})

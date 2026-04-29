import { describe, expect, it } from 'vitest'
import type { RCMLDocument } from '../types.js'
import {
  EmailTemplateErrorCodes,
  EmailTemplateValidationError,
  safeValidateEmailTemplate,
  validateEmailTemplate,
} from './validate-email-template.js'

/**
 * Minimal but legitimate RCMLDocument. Not meant to exercise every edge —
 * just something the validator should accept end-to-end.
 */
const VALID_DOC: RCMLDocument = {
  tagName: 'rcml',
  children: [
    { tagName: 'rc-head', children: [] },
    {
      tagName: 'rc-body',
      attributes: { 'background-color': '#ffffff', width: '600px' },
      children: [
        {
          tagName: 'rc-section',
          attributes: { 'background-color': '#f5f5f5', padding: '20px 0' },
          children: [
            {
              tagName: 'rc-column',
              attributes: { width: '100%' },
              children: [
                { tagName: 'rc-spacer', attributes: { height: '10px' } },
                { tagName: 'rc-divider', attributes: { 'border-color': '#cccccc' } },
              ],
            },
          ],
        },
      ],
    },
  ],
}

describe('validateEmailTemplate — JSON AST input', () => {
  it('accepts a minimal valid document', () => {
    expect(() => validateEmailTemplate(VALID_DOC)).not.toThrow()
  })

  it('rejects an unknown root tagName', () => {
    const bad = { tagName: 'not-rcml', children: [] } as unknown as RCMLDocument
    expect(() => validateEmailTemplate(bad)).toThrow(EmailTemplateValidationError)
  })

  it('rejects a rc-column placed directly under rc-body', () => {
    const bad: RCMLDocument = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            // @ts-expect-error — intentionally invalid placement
            { tagName: 'rc-column', attributes: { width: '100%' }, children: [] },
          ],
        },
      ],
    }

    const result = safeValidateEmailTemplate(bad)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errors.some((e) => e.code === EmailTemplateErrorCodes.CHILD_INVALID)).toBe(true)
  })

  it('rejects an unknown attribute on rc-section', () => {
    const bad: RCMLDocument = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            {
              tagName: 'rc-section',
              // @ts-expect-error — `foo` is not a valid rc-section attribute
              attributes: { foo: 'bar' },
              children: [{ tagName: 'rc-column', children: [] }],
            },
          ],
        },
      ],
    }
    const result = safeValidateEmailTemplate(bad)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errors.some((e) => e.code === EmailTemplateErrorCodes.ATTR_UNKNOWN)).toBe(true)
  })

  it('rejects an invalid padding value (via Zod)', () => {
    const bad: RCMLDocument = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            {
              tagName: 'rc-section',
              attributes: { padding: 'banana' },
              children: [{ tagName: 'rc-column', children: [] }],
            },
          ],
        },
      ],
    }
    const result = safeValidateEmailTemplate(bad)
    expect(result.success).toBe(false)
    if (result.success) return
    const padIssue = result.errors.find((e) => e.path.endsWith('/attributes/padding'))
    expect(padIssue).toBeDefined()
    expect(padIssue?.code).toBe(EmailTemplateErrorCodes.ATTR_INVALID_VALUE)
  })

  it('rejects a malformed color on rc-body background', () => {
    const bad: RCMLDocument = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        { tagName: 'rc-body', attributes: { 'background-color': 'not-a-color' }, children: [] },
      ],
    }
    const result = safeValidateEmailTemplate(bad)
    expect(result.success).toBe(false)
    if (result.success) return
    const colorIssue = result.errors.find((e) => e.path.endsWith('/attributes/background-color'))
    expect(colorIssue?.code).toBe(EmailTemplateErrorCodes.ATTR_INVALID_VALUE)
  })

  it('enforces rc-section maxChildCount of 20 columns', () => {
    const columns = Array.from({ length: 21 }, () => ({
      tagName: 'rc-column' as const,
      children: [],
    }))
    const bad: RCMLDocument = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            // @ts-expect-error — intentional
            { tagName: 'rc-section', children: columns },
          ],
        },
      ],
    }
    const result = safeValidateEmailTemplate(bad)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errors.some((e) => e.code === EmailTemplateErrorCodes.CHILD_TOO_MANY)).toBe(true)
  })
})

describe('validateEmailTemplate — ProseMirror content delegation', () => {
  it('accepts a rc-text with a valid ProseMirror content doc', () => {
    const doc: RCMLDocument = {
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
                    {
                      tagName: 'rc-text',
                      content: {
                        type: 'doc',
                        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    expect(() => validateEmailTemplate(doc)).not.toThrow()
  })

  it('surfaces invalid content as CONTENT_INVALID with prefixed path', () => {
    const doc: RCMLDocument = {
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
                    {
                      tagName: 'rc-text',
                      // @ts-expect-error — content's root must be type: 'doc'
                      content: { type: 'not-a-doc' },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    const result = safeValidateEmailTemplate(doc)
    expect(result.success).toBe(false)
    if (result.success) return
    const contentIssue = result.errors.find(
      (e) => e.code === EmailTemplateErrorCodes.CONTENT_INVALID,
    )
    expect(contentIssue).toBeDefined()
    expect(contentIssue?.path.startsWith('/children/1/children/0/children/0/children/0/content')).toBe(
      true,
    )
  })
})

describe('validateEmailTemplate — XML string input', () => {
  it('accepts a valid XML template with an rc-text body', () => {
    const xml = `<rcml>
      <rc-head></rc-head>
      <rc-body background-color="#ffffff" width="600px">
        <rc-section>
          <rc-column width="100%">
            <rc-text>Hello world</rc-text>
          </rc-column>
        </rc-section>
      </rc-body>
    </rcml>`
    expect(() => validateEmailTemplate(xml)).not.toThrow()
  })

  it('returns an XML_PARSE_ERROR for malformed XML', () => {
    const result = safeValidateEmailTemplate('<rcml><rc-body></rc-head></rcml>')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errors[0]?.code).toBe(EmailTemplateErrorCodes.XML_PARSE_ERROR)
  })
})

describe('EmailTemplateValidationError shape', () => {
  it('matches the expected error format', () => {
    const bad = { tagName: 'rcml' } as unknown as RCMLDocument
    let captured: EmailTemplateValidationError | null = null
    try {
      validateEmailTemplate(bad)
    } catch (err) {
      captured = err as EmailTemplateValidationError
    }
    expect(captured).toBeInstanceOf(EmailTemplateValidationError)
    expect(captured?.name).toBe('EmailTemplateValidationError')
    expect(Array.isArray(captured?.errors)).toBe(true)
    expect(captured?.message.startsWith('RCML email template validation failed:\n')).toBe(true)
  })

  it("truncates the summary with '...and N more' past 5 issues", () => {
    // Produce ≥6 issues by stacking bad attribute values on a section.
    const bad: RCMLDocument = {
      tagName: 'rcml',
      children: [
        { tagName: 'rc-head', children: [] },
        {
          tagName: 'rc-body',
          children: [
            {
              tagName: 'rc-section',
              attributes: {
                padding: 'x',
                'padding-top': 'x',
                'padding-bottom': 'x',
                'padding-left': 'x',
                'padding-right': 'x',
                'background-color': 'x',
                border: 'x',
              },
              children: [{ tagName: 'rc-column', children: [] }],
            },
          ],
        },
      ],
    }
    const result = safeValidateEmailTemplate(bad)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.errors.length).toBeGreaterThan(5)
    const err = new EmailTemplateValidationError(result.errors)
    expect(err.message).toContain('...and')
    expect(err.message).toContain('more')
  })
})

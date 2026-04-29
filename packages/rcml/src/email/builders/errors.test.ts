import { describe, expect, it } from 'vitest'
import { RcmlElementBuildError, throwIfIssues } from './errors.js'

describe('RcmlElementBuildError', () => {
  it('exposes tagName + issues on the thrown instance', () => {
    const err = new RcmlElementBuildError('rc-text', [
      { code: 'ATTR_UNKNOWN', path: 'attrs/x', message: 'unknown' },
    ])
    expect(err.tagName).toBe('rc-text')
    expect(err.issues).toHaveLength(1)
    expect(err.name).toBe('RcmlElementBuildError')
  })

  it('summarises a single issue in the message', () => {
    const err = new RcmlElementBuildError('rc-button', [
      { code: 'ATTR_INVALID_VALUE', path: 'attrs/href', message: 'bad url' },
    ])
    expect(err.message).toContain('<rc-button>')
    expect(err.message).toContain('bad url')
  })

  it('summarises multiple issues by count', () => {
    const err = new RcmlElementBuildError('rc-section', [
      { code: 'ATTR_UNKNOWN', path: 'attrs/a', message: 'x' },
      { code: 'CHILD_INVALID', path: 'children/0', message: 'y' },
    ])
    expect(err.message).toContain('2 issues')
  })
})

describe('throwIfIssues', () => {
  it('is a no-op when there are no issues', () => {
    expect(() => {
      throwIfIssues('rc-text', [])
    }).not.toThrow()
  })

  it('throws RcmlElementBuildError with the issues attached', () => {
    expect(() => {
      throwIfIssues('rc-text', [{ code: 'ATTR_UNKNOWN', path: 'attrs/x', message: 'nope' }])
    }).toThrow(RcmlElementBuildError)
  })
})

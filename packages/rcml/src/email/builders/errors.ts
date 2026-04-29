/**
 * Internal: build-time issue codes + error class for element factories.
 *
 * Mirrors the shape of {@link import('../validate-email-template.js').EmailTemplateValidationIssue}
 * so downstream tooling (MCP, validators) can consume both uniformly. The
 * class and the issue type are re-exported `@public` from
 * `../create-rcml-element.ts`.
 */

import type { RcmlTagName } from '../schema/index.js'

/**
 * Category of a single build-time issue reported by
 * {@link import('../create-rcml-element.js').RcmlElementBuildError}.
 */
export const RcmlElementBuildErrorCodes = {
  ATTR_UNKNOWN: 'ATTR_UNKNOWN',
  ATTR_INVALID_VALUE: 'ATTR_INVALID_VALUE',
  CHILD_INVALID: 'CHILD_INVALID',
  CHILD_TOO_MANY: 'CHILD_TOO_MANY',
  CHILDREN_REQUIRED: 'CHILDREN_REQUIRED',
  CONTENT_INVALID: 'CONTENT_INVALID',
  CONTENT_REQUIRED: 'CONTENT_REQUIRED',
} as const

export type RcmlElementBuildErrorCode =
  (typeof RcmlElementBuildErrorCodes)[keyof typeof RcmlElementBuildErrorCodes]

/**
 * One entry in {@link RcmlElementBuildError.issues}. `path` is a JSON-Pointer-style
 * location inside the options object (e.g. `attrs/href`, `children/2`).
 */
export interface RcmlElementBuildIssue {
  code: RcmlElementBuildErrorCode
  path: string
  message: string
}

/**
 * Thrown by every `create<Xxx>Element` factory when the supplied options
 * violate the tag's schema (unknown attr, invalid attr value, wrong child tag,
 * too many children, invalid / missing content).
 *
 * Surfaces issues at the exact call site instead of later inside
 * {@link import('../validate-email-template.js').validateEmailTemplate}.
 */
export class RcmlElementBuildError extends Error {
  readonly tagName: RcmlTagName
  readonly issues: readonly RcmlElementBuildIssue[]

  constructor(tagName: RcmlTagName, issues: readonly RcmlElementBuildIssue[]) {
    const summary = issues.length === 1 ? issues[0]!.message : `${issues.length} issues`
    super(`Cannot build <${tagName}>: ${summary}`)
    this.name = 'RcmlElementBuildError'
    this.tagName = tagName
    this.issues = issues
  }
}

/** Throw helper — builds the error only when `issues` is non-empty. */
export function throwIfIssues(tagName: RcmlTagName, issues: readonly RcmlElementBuildIssue[]): void {
  if (issues.length > 0) throw new RcmlElementBuildError(tagName, issues)
}

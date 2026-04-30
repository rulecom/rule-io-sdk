/**
 * Internal barrel for `./builders/` — consumed only by `../create-rcml-element.ts`.
 * Not part of the package's public surface.
 */

export { RcmlElementBuildError, RcmlElementBuildErrorCodes, throwIfIssues } from './errors.js'
export type { RcmlElementBuildErrorCode, RcmlElementBuildIssue } from './errors.js'

export { validateAttrs, normalizeAttrs } from './attrs.js'
export type { AttrValue } from './attrs.js'

export { validateChildren } from './children.js'

export { coerceContent } from './content.js'
export type { ContentInput, ContentCoerceResult } from './content.js'

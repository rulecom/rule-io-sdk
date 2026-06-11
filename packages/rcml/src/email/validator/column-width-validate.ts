/**
 * Internal: cross-element column-width validation.
 *
 * When an `rc-section` contains more than one `rc-column`, every column must
 * carry a percentage `width` and all widths must sum to 100 %. This pass
 * enforces that constraint. Single-column sections are left untouched (width
 * is optional there).
 */

import {
  EmailTemplateErrorCodes,
  type EmailTemplateValidationIssue,
} from '../validate-email-template.js'

const PCT_RE = /^(\d+(?:\.\d+)?)%$/

/**
 * Walk `doc` and emit `ATTR_INVALID_VALUE` issues for any multi-column
 * section whose column widths are not all valid percentages summing to 100 %.
 *
 * @param doc - Any value (expected to be an {@link import('../rcml-types.js').RcmlDocument}-shaped tree).
 * @returns A list of `ATTR_INVALID_VALUE` issues (empty on success).
 */
export function validateColumnWidths(doc: unknown): EmailTemplateValidationIssue[] {
  const issues: EmailTemplateValidationIssue[] = []

  visitNode(doc, '', issues)

  return issues
}

function visitNode(node: unknown, path: string, issues: EmailTemplateValidationIssue[]): void {
  if (!isObj(node)) return

  if (node.tagName === 'rc-section') {
    const children: unknown[] = Array.isArray(node.children) ? node.children : []
    const columns = children
      .map((c, i) => ({ node: c, index: i }))
      .filter(({ node: c }) => isObj(c) && c.tagName === 'rc-column')

    if (columns.length > 1) {
      let sum = 0
      let hasError = false

      for (const { node: col, index } of columns) {
        const colPath = `${path}/children/${index}`
        const width =
          isObj(col) && isObj(col.attributes) ? (col.attributes.width as unknown) : undefined

        if (typeof width !== 'string') {
          issues.push({
            path: `${colPath}/attributes/width`,
            code: EmailTemplateErrorCodes.ATTR_INVALID_VALUE,
            message: 'Column in a multi-column section must have a percentage width (e.g. "50%").',
          })
          hasError = true
          continue
        }

        const m = PCT_RE.exec(width)

        if (!m) {
          issues.push({
            path: `${colPath}/attributes/width`,
            code: EmailTemplateErrorCodes.ATTR_INVALID_VALUE,
            message: `Column width "${width}" must be a percentage in a multi-column section (e.g. "50%").`,
          })
          hasError = true
          continue
        }

        sum += parseFloat(m[1])
      }

      if (!hasError && Math.abs(sum - 100) > 0.5) {
        issues.push({
          path: `${path}/children`,
          code: EmailTemplateErrorCodes.ATTR_INVALID_VALUE,
          message: `Column widths in this section sum to ${sum}% but must sum to 100%.`,
        })
      }
    }
  }

  if (Array.isArray(node.children)) {
    node.children.forEach((child: unknown, i: number) => {
      visitNode(child, `${path}/children/${i}`, issues)
    })
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

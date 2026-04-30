import type {
  BlockNode,
  InlineNode,
  TextNode,
  Mark,
  ParagraphNode,
  BulletListNode,
  OrderedListNode,
  AlignNode,
  ListItemNode,
} from './types.js'

// ─── Public types ─────────────────────────────────────────────────────────────

export type SemanticIssue = {
  /** JSON Pointer path to the offending node (e.g. `/content/0/content/1/marks/0`) */
  path: string
  /** Machine-readable error code (e.g. `MARK_DUPLICATE`, `TEXT_EMPTY`) */
  code: string
  /** Human-readable description of the issue */
  message: string
  /** `"error"` = structurally invalid; `"warning"` = valid but non-canonical */
  severity: 'error' | 'warning'
}

export type SemanticValidationResult =
  | { success: true }
  | { success: false; issues: SemanticIssue[] }

// ─── Visitors ─────────────────────────────────────────────────────────────────

/**
 * Recursively visit all block nodes and collect semantic issues.
 * @internal
 */
export function visitBlocks(blocks: BlockNode[], path: string, issues: SemanticIssue[]): void {
  for (const [i, block] of blocks.entries()) {
    visitBlock(block, `${path}/${i}`, issues)
  }
}

/** @internal */
function visitBlock(block: BlockNode, path: string, issues: SemanticIssue[]): void {
  switch (block.type) {
    case 'paragraph':
      visitParagraph(block, path, issues)
      break
    case 'bullet-list':
    case 'ordered-list':
      visitList(block, path, issues)
      break
    case 'align':
      visitAlign(block, path, issues)
      break
  }
}

/** @internal */
function visitParagraph(node: ParagraphNode, path: string, issues: SemanticIssue[]): void {
  if (node.content !== undefined && node.content.length > 0) {
    visitInlines(node.content, `${path}/content`, issues)
  }
}

/** @internal */
function visitList(node: BulletListNode | OrderedListNode, path: string, issues: SemanticIssue[]): void {
  for (const [i, item] of node.content.entries()) {
    visitListItem(item, `${path}/content/${i}`, issues)
  }
}

/** @internal */
function visitListItem(node: ListItemNode, path: string, issues: SemanticIssue[]): void {
  visitBlocks(node.content, `${path}/content`, issues)
}

/** @internal */
function visitAlign(node: AlignNode, path: string, issues: SemanticIssue[]): void {
  visitBlocks(node.content, `${path}/content`, issues)
}

/** @internal */
function visitInlines(inlines: InlineNode[], path: string, issues: SemanticIssue[]): void {
  for (const [i, node] of inlines.entries()) {
    const nodePath = `${path}/${i}`

    if (node.type === 'text') {
      visitText(node, nodePath, issues)

      // Check adjacency: consecutive text nodes with the same mark set should be merged
      const next = inlines[i + 1]

      if (next !== undefined && next.type === 'text' && marksEqual(node.marks, next.marks)) {
        issues.push({
          path: nodePath,
          code: 'TEXT_ADJACENT',
          message: 'Adjacent text nodes with identical marks should be merged into one',
          severity: 'warning',
        })
      }
    }
  }
}

/** @internal */
function visitText(node: TextNode, path: string, issues: SemanticIssue[]): void {
  if (node.text === '') {
    issues.push({
      path,
      code: 'TEXT_EMPTY',
      message: 'Text node has empty text',
      severity: 'error',
    })
  }

  if (node.marks !== undefined) {
    if (node.marks.length === 0) {
      issues.push({
        path: `${path}/marks`,
        code: 'ARRAY_EMPTY_MARKS',
        message: 'Empty marks array should be omitted rather than set to []',
        severity: 'warning',
      })
    } else {
      visitMarks(node.marks, `${path}/marks`, issues)
    }
  }
}

/** @internal */
function visitMarks(marks: Mark[], path: string, issues: SemanticIssue[]): void {
  const seen = new Set<string>()

  for (const [i, mark] of marks.entries()) {

    if (seen.has(mark.type)) {
      issues.push({
        path: `${path}/${i}`,
        code: 'MARK_DUPLICATE',
        message: `Duplicate mark type "${mark.type}" — a text node must not carry the same mark twice`,
        severity: 'error',
      })
    } else {
      seen.add(mark.type)
    }

    if (mark.type === 'font') {
      const allNull = Object.values(mark.attrs).every((v) => v === null)

      if (allNull) {
        issues.push({
          path: `${path}/${i}`,
          code: 'MARK_ALL_NULL',
          message: 'Font mark has no active attributes (all are null) and has no effect',
          severity: 'warning',
        })
      }
    }
  }
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

/**
 * Normalize a single block node to canonical form.
 * @internal
 */
export function normalizeBlock(block: BlockNode): BlockNode {
  switch (block.type) {
    case 'paragraph':
      return block.content === undefined
        ? block
        : { ...block, content: normalizeInlines(block.content) }

    case 'bullet-list':
      return {
        ...block,
        content: block.content.map((item) => normalizeListItem(item)),
      }

    case 'ordered-list':
      return {
        ...block,
        content: block.content.map((item) => normalizeListItem(item)),
      }

    case 'align':
      return { ...block, content: block.content.map(normalizeBlock) }
  }
}

/** @internal */
function normalizeListItem(item: ListItemNode): ListItemNode {
  return { ...item, content: item.content.map(normalizeBlock) }
}

/** @internal */
function normalizeInlines(inlines: InlineNode[]): InlineNode[] {
  // Step 1: remove empty text nodes, normalize marks on text nodes
  const cleaned = inlines.flatMap((node): InlineNode[] => {
    if (node.type !== 'text') return [node]

    if (node.text === '') return []

    if (node.marks !== undefined && node.marks.length === 0) {
      const { marks: _marks, ...rest } = node

      return [rest]
    }

    return [node]
  })

  // Step 2: merge adjacent text nodes with identical mark sets
  const merged: InlineNode[] = []

  for (const node of cleaned) {
    if (node.type !== 'text') {
      merged.push(node)
      continue
    }

    const prev = merged[merged.length - 1]

    if (prev !== undefined && prev.type === 'text' && marksEqual(prev.marks, node.marks)) {
      merged[merged.length - 1] = { ...prev, text: prev.text + node.text }
    } else {
      merged.push(node)
    }
  }

  return merged
}

/**
 * Return true when two mark arrays are equal regardless of order.
 * @internal
 */
function marksEqual(a: Mark[] | undefined, b: Mark[] | undefined): boolean {
  const aArr = a ?? []
  const bArr = b ?? []

  if (aArr.length !== bArr.length) return false

  const key = (marks: Mark[]) =>
    JSON.stringify([...marks].sort((x, y) => x.type.localeCompare(y.type)))

  return key(aArr) === key(bArr)
}

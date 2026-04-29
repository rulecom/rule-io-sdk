import { Schema } from 'prosemirror-model'

/**
 * ProseMirror schema that exactly matches the Milkdown editor's RFM preset.
 *
 * Type names follow the editor's kebab-case convention (`bullet-list`, `list-item`,
 * `hardbreak`, etc.) as documented in `ai-context/SCHEMA.md`.
 *
 * Mark attribute names use hyphenated CSS property names (`font-weight`, `no-tracked`)
 * to match the strings emitted by `doc.toJSON()` in the editor.
 *
 * @internal — used by {@link convert}; not part of the public API.
 */
export const rcmlSchema = new Schema({
  nodes: {
    // ─── Root ────────────────────────────────────────────────────────────────
    doc: {
      content: 'block+',
    },

    // ─── Block nodes ─────────────────────────────────────────────────────────
    paragraph: {
      group: 'block',
      content: 'inline*',
    },

    'bullet-list': {
      group: 'block',
      content: 'listItem+',
      attrs: {
        spread: { default: false },
      },
    },

    'ordered-list': {
      group: 'block',
      content: 'listItem+',
      attrs: {
        order: { default: 1 },
        spread: { default: false },
      },
    },

    'list-item': {
      group: 'listItem',
      content: 'block+',
      defining: true,
      attrs: {
        label: { default: '•' },
        'list-type': { default: 'bullet' },
        spread: { default: 'true' },
      },
    },

    align: {
      group: 'block',
      content: 'block+',
      defining: true,
      attrs: {
        value: { default: 'left' },
      },
    },

    // ─── Inline nodes ─────────────────────────────────────────────────────────
    text: {
      group: 'inline',
    },

    hardbreak: {
      group: 'inline',
      inline: true,
      selectable: false,
      attrs: {
        isInline: { default: false },
      },
    },

    placeholder: {
      group: 'inline',
      inline: true,
      atom: true,
      attrs: {
        type: {},
        value: {},
        name: {},
        original: {},
        'max-length': { default: null },
      },
    },

    'placeholder-value-fragment': {
      group: 'inline',
      inline: true,
      atom: true,
      attrs: {
        text: { default: '' },
      },
    },

    'loop-value': {
      group: 'inline',
      inline: true,
      atom: true,
      attrs: {
        original: {},
        value: {},
        index: {},
      },
    },
  },

  marks: {
    // ─── Font mark ───────────────────────────────────────────────────────────
    /**
     * The only text-styling mark. Bold, italic, underline, strikethrough,
     * color, and typography are all attribute toggles on this single mark.
     */
    font: {
      attrs: {
        'font-family': { default: null },
        'font-size': { default: null },
        'line-height': { default: null },
        'letter-spacing': { default: null },
        'font-style': { default: null },
        'font-weight': { default: null },
        'text-decoration': { default: null },
        color: { default: null },
      },
    },

    // ─── Link mark ───────────────────────────────────────────────────────────
    link: {
      attrs: {
        href: {},
        target: { default: null },
        'no-tracked': { default: 'false' },
      },
    },
  },
})

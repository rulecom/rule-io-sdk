import type { Root } from 'mdast'
import type { VFile } from 'vfile'

export type { Root } from 'mdast'

/**
 * A single validation error produced by the MDAST validator.
 * @internal
 */
export interface ValidationError {
  /** Dot-path into the AST (e.g. `"paragraph[0] > textDirective[1]"`). */
  path: string;
  /** 1-based source line number, if position info is available. */
  line?: number;
  /** 1-based source column number, if position info is available. */
  column?: number;
  /** Human-readable description of the error. */
  message: string;
}

/**
 * Result returned by the MDAST validator.
 * @internal
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Options for the low-level {@link parse} function.
 * @internal
 */
export interface RcmlParseOptions {
  /**
   * Include position information in AST nodes.
   * @default true
   */
  position?: boolean;
}

/**
 * Return value of {@link parse}, containing the raw MDAST and the VFile.
 * @internal
 */
export interface RcmlParseResult {
  /** The Remark MDAST Root node. Must be validated before passing to `transform()`. */
  ast: Root;
  /** The VFile used during parsing (carries path and message metadata). */
  file: VFile;
}

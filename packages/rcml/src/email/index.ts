/**
 * Barrel for the `packages/rcml/src/email/` public surface.
 *
 * Every file re-exported here contains **only public symbols**, each marked
 * `@public` in its JSDoc. Internal helpers live under `./content/`,
 * `./validator/`, `./schema/`, and `./builders/` and are not exported from
 * this barrel.
 */

export * from './rcml-types.js'
export * from './validate-email-template.js'
export * from './validate-rcml-json.js'
export * from './rfm-to-json.js'
export * from './json-to-rfm.js'
export * from './rcml-to-xml.js'
export * from './xml-to-rcml.js'
export * from './create-rcml-element.js'
export * from './theme-types.js'
export * from './theme-defaults.js'
export * from './create-theme.js'
export * from './apply-theme.js'
export * from './get-theme.js'

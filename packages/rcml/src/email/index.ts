/**
 * Barrel for the `packages/rcml/src/email/` public surface.
 *
 * Every file re-exported here contains **only public symbols**, each marked
 * `@public` in its JSDoc. Internal helpers live under `./content/`,
 * `./validator/`, and `./schema/` and are not exported from this barrel.
 */

export * from './validate-email-template.js'
export * from './validate-rcml-json.js'
export * from './rfm-to-json.js'
export * from './json-to-rfm.js'
export * from './rcml-to-xml.js'
export * from './xml-to-rcml.js'

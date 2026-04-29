/**
 * Internal barrel for `packages/rcml/src/email/xml/`.
 *
 * Re-exports only the helpers that cross the folder boundary — the public
 * files `../xml-to-rcml.ts` and `../rcml-to-xml.ts`. Everything else
 * (types, private helpers, parser / builder instances) stays module-local.
 */

export { convertXmlToRcml } from './parse-helpers.js'
export { serializeRcmlToXml } from './serialize-helpers.js'

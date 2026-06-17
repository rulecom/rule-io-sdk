// Error types
export { SmsDocumentBuildErrorCodes, SmsDocumentBuildError, throwIfSmsIssues } from './errors.js'
export type { SmsDocumentBuildErrorCode, SmsDocumentBuildIssue } from './errors.js'

// Content node builders
export {
  createContent,
  createHardbreakNode,
  createParagraphNode,
  createTextNode,
} from './nodes.js'
export type {
  CreateSmsContentOptions,
  CreateSmsParagraphNodeOptions,
  CreateSmsTextNodeOptions,
} from './nodes.js'

// Mark builders
export { createLinkMark } from './marks.js'
export type { CreateSmsLinkMarkOptions } from './marks.js'

// Placeholder builders
export {
  createCustomFieldPlaceholder,
  createDatePlaceholder,
  createLinkPlaceholder,
  createPlaceholderNode,
  createRemoteContentPlaceholder,
  createSubscriberPlaceholder,
  createUserPlaceholder,
} from './placeholders.js'
export type {
  CreateSmsCustomFieldPlaceholderOptions,
  CreateSmsDatePlaceholderOptions,
  CreateSmsLinkPlaceholderOptions,
  CreateSmsPlaceholderNodeOptions,
  CreateSmsRemoteContentPlaceholderOptions,
  CreateSmsSubscriberPlaceholderOptions,
  CreateSmsUserPlaceholderOptions,
  SmsDateFormat,
  SmsDateSource,
  SmsSystemLinkType,
} from './placeholders.js'

// Namespace bundle
export { sms } from './sms-namespace.js'

/**
 * Internal: enumeration of all RCML tag names supported by the Rule.io
 * email editor. Shared between the ported NodeSpec map
 * (`./specs.ts`) and the JSON Schema generator
 * (`../validator/json-schema.ts`).
 */
export enum RcmlTagNamesEnum {
  Rcml = 'rcml',
  Head = 'rc-head',
  BrandStyle = 'rc-brand-style',
  Font = 'rc-font',
  Attributes = 'rc-attributes',
  Preview = 'rc-preview',
  Body = 'rc-body',
  Section = 'rc-section',
  Column = 'rc-column',
  Image = 'rc-image',
  Logo = 'rc-logo',
  Video = 'rc-video',
  Heading = 'rc-heading',
  Text = 'rc-text',
  Spacer = 'rc-spacer',
  Divider = 'rc-divider',
  Button = 'rc-button',
  Social = 'rc-social',
  SocialElement = 'rc-social-element',
  Class = 'rc-class',
  Switch = 'rc-switch',
  Case = 'rc-case',
  Loop = 'rc-loop',
  Group = 'rc-group',
  PlainText = 'rc-plain-text',
  Raw = 'rc-raw',
  Wrapper = 'rc-wrapper',
}

/** String-union equivalent of {@link RcmlTagNamesEnum}. */
export type RcmlTagName = `${RcmlTagNamesEnum}`

/** Tag names whose nodes carry a ProseMirror content document instead of children. */
export const TAGS_WITH_PM_CONTENT: readonly RcmlTagName[] = [
  RcmlTagNamesEnum.Text,
  RcmlTagNamesEnum.Heading,
  RcmlTagNamesEnum.Button,
]

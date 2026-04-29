/**
 * RCML tag NodeSpecs — validator-only subset.
 *
 * Each entry declares the attributes a tag accepts (with a Zod validator per
 * attribute, see `../validator/attr-validators.ts`), whether the tag is a
 * leaf, its allowed child tags, and any child-count cap. Editor-runtime
 * concerns (rendering hooks, computed attributes, default-attr inheritance
 * via `rc-head` / `rc-class`) are intentionally out of scope — validation
 * here is syntactic only.
 */

// Deep import avoids a module cycle: going through `../validator/index.js`
// would re-export `ajv-validate` → `json-schema` → back into this file.
import { RcmlAttributeValidatorsEnum as V } from '../validator/attr-validators.js'
import type { RcmlNodeSpec } from './types.js'
import { RcmlTagNamesEnum as T, type RcmlTagName } from './tag-names.js'

// ---------------------------------------------------------------------------
// Root + head
// ---------------------------------------------------------------------------

const rcmlSpec: RcmlNodeSpec = {
  attrs: {},
  isLeaf: false,
  validChildTypes: [T.Head, T.Body],
}

const headSpec: RcmlNodeSpec = {
  attrs: {},
  isLeaf: false,
  validChildTypes: [T.BrandStyle, T.Attributes, T.Preview, T.Class, T.PlainText],
}

const brandStyleSpec: RcmlNodeSpec = {
  attrs: {
    id: { validator: V.PositiveNumber },
  },
  isLeaf: true,
}

const fontSpec: RcmlNodeSpec = {
  attrs: {
    name: { validator: V.String },
    href: { validator: V.Url },
  },
  isLeaf: true,
}

const attributesSpec: RcmlNodeSpec = {
  attrs: {},
  isLeaf: false,
  validChildTypes: [T.Body, T.Section, T.Button, T.Heading, T.Text, T.Social],
}

const previewSpec: RcmlNodeSpec = {
  attrs: {},
  isLeaf: true,
}

const classSpec: RcmlNodeSpec = {
  attrs: {
    name: { validator: V.String },
    'background-color': { validator: V.Color },
    color: { validator: V.Color },
    'font-family': { validator: V.FontFamily },
    'font-size': { validator: V.Px },
    'font-style': { validator: V.FontStyle },
    'font-weight': { validator: V.FontWeight },
    'letter-spacing': { validator: V.LetterSpacing },
    'line-height': { validator: V.PxOrPercentage },
    'text-decoration': { validator: V.TextDecoration },
    'text-transform': { validator: V.TextTransform },
    src: { validator: V.String },
    width: { validator: V.Px },
  },
  isLeaf: true,
}

const plainTextSpec: RcmlNodeSpec = {
  attrs: {},
  isLeaf: true,
}

const rawSpec: RcmlNodeSpec = {
  attrs: {},
  isLeaf: true,
}

// ---------------------------------------------------------------------------
// Body / structural
// ---------------------------------------------------------------------------

const bodySpec: RcmlNodeSpec = {
  attrs: {
    'background-color': { validator: V.Color },
    width: { validator: V.Px, default: '600px' },
  },
  isLeaf: false,
  validChildTypes: [T.Section, T.Loop, T.Switch, T.Wrapper],
}

const sectionSpec: RcmlNodeSpec = {
  attrs: {
    'background-color': { validator: V.Color },
    'background-url': { validator: V.Url },
    'background-repeat': { validator: V.BackgroundRepeat, default: 'repeat' },
    'background-size': { validator: V.BackgroundSize, default: 'auto' },
    'background-position': { validator: V.BackgroundPosition, default: 'top center' },
    'background-position-x': { validator: V.BackgroundPositionX },
    'background-position-y': { validator: V.BackgroundPositionY },
    border: { validator: V.Border, default: 'none' },
    'border-bottom': { validator: V.Border },
    'border-left': { validator: V.Border },
    'border-right': { validator: V.Border },
    'border-top': { validator: V.Border },
    'border-radius': { validator: V.BorderRadius },
    'css-class': { validator: V.String },
    direction: { validator: V.Direction, default: 'ltr' },
    'full-width': { validator: V.FullWidth },
    hide: { validator: V.HideSection },
    padding: { validator: V.Padding, default: '20px 0' },
    'padding-top': { validator: V.Px },
    'padding-bottom': { validator: V.Px },
    'padding-left': { validator: V.Px },
    'padding-right': { validator: V.Px },
    'padding-on-mobile': { validator: V.Padding },
    'text-align': { validator: V.TextAlign, default: 'center' },
    'text-padding': { validator: V.Padding, default: '4px 4px 4px 0' },
  },
  isLeaf: false,
  validChildTypes: [T.Column],
  maxChildCount: 20,
}

const VALID_COLUMN_CHILDREN: readonly RcmlTagName[] = Object.values(T).filter(
  (tag) =>
    ![
      T.Rcml,
      T.Head,
      T.BrandStyle,
      T.Attributes,
      T.Preview,
      T.Body,
      T.Section,
      T.Column,
      T.SocialElement,
      T.Class,
      T.Switch,
      T.Case,
    ].includes(tag as T),
) as readonly RcmlTagName[]

const columnSpec: RcmlNodeSpec = {
  attrs: {
    'background-color': { validator: V.Color },
    border: { validator: V.Border },
    'border-bottom': { validator: V.Border },
    'border-left': { validator: V.Border },
    'border-right': { validator: V.Border },
    'border-top': { validator: V.Border },
    'border-radius': { validator: V.BorderRadius },
    'css-class': { validator: V.String },
    direction: { validator: V.Direction, default: 'ltr' },
    'inner-background-color': { validator: V.Color },
    'inner-border': { validator: V.Border },
    'inner-border-bottom': { validator: V.Border },
    'inner-border-left': { validator: V.Border },
    'inner-border-right': { validator: V.Border },
    'inner-border-top': { validator: V.Border },
    'inner-border-radius': { validator: V.BorderRadius },
    padding: { validator: V.Padding },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    'padding-on-mobile': { validator: V.Padding },
    'vertical-align': { validator: V.VerticalAlign, default: 'top' },
    width: { validator: V.PxOrPercentage },
  },
  isLeaf: false,
  validChildTypes: VALID_COLUMN_CHILDREN,
}

const wrapperSpec: RcmlNodeSpec = {
  attrs: {
    'background-color': { validator: V.Color },
    'background-url': { validator: V.Url },
    'background-repeat': { validator: V.BackgroundRepeat, default: 'repeat' },
    'background-size': { validator: V.BackgroundSize, default: 'auto' },
    'background-position': { validator: V.BackgroundPosition, default: 'top center' },
    'background-position-x': { validator: V.BackgroundPositionX },
    'background-position-y': { validator: V.BackgroundPositionY },
    border: { validator: V.Border, default: 'none' },
    'border-bottom': { validator: V.Border },
    'border-left': { validator: V.Border },
    'border-right': { validator: V.Border },
    'border-top': { validator: V.Border },
    'border-radius': { validator: V.BorderRadius },
    'full-width': { validator: V.FullWidth },
    padding: { validator: V.Padding, default: '20px 0' },
    'padding-top': { validator: V.Px },
    'padding-bottom': { validator: V.Px },
    'padding-left': { validator: V.Px },
    'padding-right': { validator: V.Px },
    'padding-on-mobile': { validator: V.Padding },
  },
  isLeaf: false,
  validChildTypes: [T.Switch, T.Section],
}

const groupSpec: RcmlNodeSpec = {
  attrs: {},
  isLeaf: false,
  validChildTypes: [T.Column],
}

// ---------------------------------------------------------------------------
// Control flow
// ---------------------------------------------------------------------------

const switchSpec: RcmlNodeSpec = {
  attrs: {},
  isLeaf: false,
  validChildTypes: [T.Case],
}

const caseSpec: RcmlNodeSpec = {
  attrs: {
    'case-type': { validator: V.CaseType },
    'case-property': { validator: V.CaseProperty },
    'case-condition': { validator: V.CaseCondition },
    'case-value': { validator: V.CaseValue },
    'case-active': { validator: V.CaseActive },
  },
  isLeaf: false,
  validChildTypes: [T.Section],
}

const loopSpec: RcmlNodeSpec = {
  attrs: {
    'loop-type': { validator: V.LoopType },
    'loop-value': { validator: V.LoopValue },
    'loop-max-iterations': { validator: V.LoopMaxIterations },
  },
  isLeaf: false,
  validChildTypes: [T.Section],
}

// ---------------------------------------------------------------------------
// Content leaves
// ---------------------------------------------------------------------------

const textSpec: RcmlNodeSpec = {
  attrs: {
    align: { validator: V.TextAlign, default: 'left' },
    color: { validator: V.Color },
    'container-background-color': { validator: V.Color },
    'css-class': { validator: V.String },
    'rc-class': { validator: V.String },
    'font-family': { validator: V.FontFamily },
    'font-size': { validator: V.Px },
    'font-style': { validator: V.FontStyle },
    'font-weight': { validator: V.FontWeight },
    height: { validator: V.PxOrPercentage },
    'letter-spacing': { validator: V.LetterSpacing },
    'line-height': { validator: V.PxOrPercentage },
    padding: { validator: V.Padding, default: '0 0 20px 0' },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    'padding-on-mobile': { validator: V.Padding },
    'text-decoration': { validator: V.TextDecoration },
    'text-transform': { validator: V.TextTransform },
    'vertical-align': { validator: V.VerticalAlign },
  },
  isLeaf: true,
}

const headingSpec: RcmlNodeSpec = {
  attrs: {
    align: { validator: V.TextAlign, default: 'left' },
    'background-color': { validator: V.Color },
    color: { validator: V.Color },
    'container-background-color': { validator: V.Color },
    'css-class': { validator: V.String },
    'rc-class': { validator: V.String },
    'font-family': { validator: V.FontFamily },
    'font-size': { validator: V.Px },
    'font-style': { validator: V.FontStyle },
    'font-weight': { validator: V.FontWeight },
    height: { validator: V.PxOrPercentage },
    'letter-spacing': { validator: V.LetterSpacing },
    'line-height': { validator: V.PxOrPercentage },
    padding: { validator: V.Padding, default: '0 0 20px 0' },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    'padding-on-mobile': { validator: V.Padding },
    'text-decoration': { validator: V.TextDecoration },
    'text-transform': { validator: V.TextTransform },
    'vertical-align': { validator: V.VerticalAlign },
  },
  isLeaf: true,
}

const buttonSpec: RcmlNodeSpec = {
  attrs: {
    align: { validator: V.Align, default: 'center' },
    'background-color': { validator: V.Color },
    border: { validator: V.Border, default: 'none' },
    'border-bottom': { validator: V.Border },
    'border-left': { validator: V.Border },
    'border-right': { validator: V.Border },
    'border-top': { validator: V.Border },
    'border-radius': { validator: V.BorderRadius, default: '8px' },
    color: { validator: V.Color },
    'container-background-color': { validator: V.Color },
    'css-class': { validator: V.String },
    'rc-class': { validator: V.String },
    'font-family': { validator: V.FontFamily },
    'font-size': { validator: V.Px },
    'font-style': { validator: V.FontStyle },
    'font-weight': { validator: V.FontWeight },
    height: { validator: V.PxOrPercentage },
    href: { validator: V.Url },
    'inner-padding': { validator: V.Padding, default: '10px 16px' },
    'letter-spacing': { validator: V.LetterSpacing },
    'line-height': { validator: V.PxOrPercentage },
    name: { validator: V.String },
    padding: { validator: V.Padding, default: '0 0 20px 0' },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    'padding-on-mobile': { validator: V.Padding },
    rel: { validator: V.String },
    target: { validator: V.Target },
    'text-align': { validator: V.Align, default: 'center' },
    'text-decoration': { validator: V.TextDecoration },
    'text-transform': { validator: V.TextTransform },
    title: { validator: V.String },
    'vertical-align': { validator: V.VerticalAlign, default: 'middle' },
    width: { validator: V.PxOrPercentage },
  },
  isLeaf: true,
}

const imageSpec: RcmlNodeSpec = {
  attrs: {
    align: { validator: V.Align, default: 'center' },
    'align-on-mobile': { validator: V.Align },
    alt: { validator: V.String, default: '' },
    border: { validator: V.Border },
    'border-bottom': { validator: V.Border },
    'border-left': { validator: V.Border },
    'border-right': { validator: V.Border },
    'border-top': { validator: V.Border },
    'border-radius': { validator: V.BorderRadius },
    'container-background-color': { validator: V.Color },
    'css-class': { validator: V.String },
    'fluid-on-mobile': { validator: V.FluidOnMobile },
    'font-size': { validator: V.Px, default: '14px' },
    height: { validator: V.PxOrAuto, default: 'auto' },
    href: { validator: V.Url },
    'max-height': { validator: V.PxOrPercentage },
    name: { validator: V.String },
    padding: { validator: V.Padding, default: '0 0 20px' },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    'padding-on-mobile': { validator: V.Padding },
    rel: { validator: V.String },
    src: { validator: V.Url },
    target: { validator: V.Target, default: '_blank' },
    title: { validator: V.String },
    width: { validator: V.Px },
  },
  isLeaf: true,
}

const logoSpec: RcmlNodeSpec = {
  attrs: {
    align: { validator: V.Align, default: 'center' },
    'align-on-mobile': { validator: V.Align },
    alt: { validator: V.String, default: '' },
    border: { validator: V.Border },
    'border-bottom': { validator: V.Border },
    'border-left': { validator: V.Border },
    'border-right': { validator: V.Border },
    'border-top': { validator: V.Border },
    'border-radius': { validator: V.BorderRadius },
    'container-background-color': { validator: V.Color },
    'css-class': { validator: V.String },
    'fluid-on-mobile': { validator: V.Boolean },
    'font-size': { validator: V.Px, default: '14px' },
    height: { validator: V.PxOrAuto, default: 'auto' },
    href: { validator: V.Url },
    'max-height': { validator: V.PxOrPercentage },
    name: { validator: V.String },
    padding: { validator: V.Padding, default: '0 0 20px' },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    'padding-on-mobile': { validator: V.Padding },
    rel: { validator: V.String },
    src: { validator: V.Url },
    target: { validator: V.Target, default: '_blank' },
    title: { validator: V.String },
    width: { validator: V.Px, default: '96px' },
    'rc-class': { validator: V.String },
  },
  isLeaf: true,
}

const videoSpec: RcmlNodeSpec = {
  attrs: {
    align: { validator: V.Align, default: 'center' },
    'align-on-mobile': { validator: V.Align },
    alt: { validator: V.String, default: '' },
    border: { validator: V.Border },
    'border-bottom': { validator: V.Border },
    'border-left': { validator: V.Border },
    'border-right': { validator: V.Border },
    'border-top': { validator: V.Border },
    'border-radius': { validator: V.BorderRadius },
    'button-url': { validator: V.Url },
    'container-background-color': { validator: V.Color },
    'css-class': { validator: V.String },
    'fluid-on-mobile': { validator: V.Boolean },
    'font-size': { validator: V.Px, default: '14px' },
    height: { validator: V.PxOrAuto, default: 'auto' },
    href: { validator: V.Url },
    'max-height': { validator: V.PxOrPercentage },
    name: { validator: V.String },
    padding: { validator: V.Padding, default: '0 0 20px' },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    'padding-on-mobile': { validator: V.Padding },
    rel: { validator: V.String },
    src: { validator: V.Url },
    target: { validator: V.Target, default: '_blank' },
    title: { validator: V.String },
    width: { validator: V.Px },
  },
  isLeaf: true,
}

const spacerSpec: RcmlNodeSpec = {
  attrs: {
    'container-background-color': { validator: V.Color },
    'css-class': { validator: V.String },
    height: { validator: V.PxOrPercentage, default: '32px' },
    padding: { validator: V.Padding },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    'padding-on-mobile': { validator: V.Padding },
  },
  isLeaf: true,
}

const dividerSpec: RcmlNodeSpec = {
  attrs: {
    align: { validator: V.Align, default: 'center' },
    'border-color': { validator: V.Color, default: '#000000' },
    'border-style': { validator: V.BorderStyle, default: 'solid' },
    'border-width': { validator: V.Px, default: '1px' },
    'container-background-color': { validator: V.Color },
    'css-class': { validator: V.String },
    padding: { validator: V.Padding, default: '20px 0' },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    'padding-on-mobile': { validator: V.Padding },
    width: { validator: V.PxOrPercentage, default: '100%' },
  },
  isLeaf: true,
}

const socialSpec: RcmlNodeSpec = {
  attrs: {
    align: { validator: V.Align, default: 'center' },
    'border-radius': { validator: V.BorderRadius, default: '3px' },
    color: { validator: V.Color, default: '#333333' },
    'container-background-color': { validator: V.Color },
    'css-class': { validator: V.String },
    'font-family': { validator: V.FontFamily, default: 'Helvetica, sans-serif' },
    'font-size': { validator: V.Px, default: '13px' },
    'font-style': { validator: V.FontStyle },
    'font-weight': { validator: V.FontWeight, default: '400' },
    'icon-size': { validator: V.PxOrPercentage, default: '20px' },
    'icon-height': { validator: V.PxOrPercentage },
    'icon-padding': { validator: V.Padding },
    'inner-padding': { validator: V.Padding, default: '4px' },
    'line-height': { validator: V.PxOrPercentage, default: '120%' },
    mode: { validator: V.SocialMode, default: 'horizontal' },
    padding: { validator: V.Padding, default: '0 0 20px 0' },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    'padding-on-mobile': { validator: V.Padding },
    'table-layout': { validator: V.TableLayout },
    'text-decoration': { validator: V.TextDecoration, default: 'none' },
    'text-padding': { validator: V.Padding },
    'vertical-align': { validator: V.VerticalAlign },
  },
  isLeaf: false,
  validChildTypes: [T.SocialElement],
}

const socialElementSpec: RcmlNodeSpec = {
  attrs: {
    align: { validator: V.Align, default: 'left' },
    alt: { validator: V.String, default: '' },
    'background-color': { validator: V.Color },
    'border-radius': { validator: V.BorderRadius, default: '3px' },
    color: { validator: V.Color, default: '#333333' },
    'font-family': { validator: V.FontFamily, default: 'Helvetica, sans-serif' },
    'font-size': { validator: V.Px, default: '13px' },
    'font-style': { validator: V.FontStyle },
    'font-weight': { validator: V.FontWeight, default: '400' },
    href: { validator: V.Url },
    'icon-height': { validator: V.PxOrPercentage },
    'icon-padding': { validator: V.Padding },
    'icon-color': { validator: V.SocialIconColor, default: 'brand' },
    'icon-shape': { validator: V.SocialIconShape, default: 'original' },
    'icon-size': { validator: V.PxOrPercentage },
    'line-height': { validator: V.PxOrPercentage, default: '120%' },
    name: { validator: V.String },
    padding: { validator: V.Padding, default: '4px' },
    'padding-top': { validator: V.PxOrPercentage },
    'padding-bottom': { validator: V.PxOrPercentage },
    'padding-left': { validator: V.PxOrPercentage },
    'padding-right': { validator: V.PxOrPercentage },
    rel: { validator: V.String },
    src: { validator: V.Url },
    target: { validator: V.Target, default: '_blank' },
    'text-decoration': { validator: V.TextDecoration, default: 'none' },
    'text-padding': { validator: V.Padding, default: '4px 4px 4px 0' },
    title: { validator: V.String },
    'vertical-align': { validator: V.VerticalAlign, default: 'middle' },
  },
  isLeaf: true,
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export const RCML_SCHEMA_SPEC: Readonly<Record<RcmlTagName, RcmlNodeSpec>> = {
  [T.Rcml]: rcmlSpec,
  [T.Head]: headSpec,
  [T.BrandStyle]: brandStyleSpec,
  [T.Font]: fontSpec,
  [T.Attributes]: attributesSpec,
  [T.Preview]: previewSpec,
  [T.Class]: classSpec,
  [T.PlainText]: plainTextSpec,
  [T.Raw]: rawSpec,
  [T.Body]: bodySpec,
  [T.Section]: sectionSpec,
  [T.Column]: columnSpec,
  [T.Wrapper]: wrapperSpec,
  [T.Group]: groupSpec,
  [T.Switch]: switchSpec,
  [T.Case]: caseSpec,
  [T.Loop]: loopSpec,
  [T.Text]: textSpec,
  [T.Heading]: headingSpec,
  [T.Button]: buttonSpec,
  [T.Image]: imageSpec,
  [T.Logo]: logoSpec,
  [T.Video]: videoSpec,
  [T.Spacer]: spacerSpec,
  [T.Divider]: dividerSpec,
  [T.Social]: socialSpec,
  [T.SocialElement]: socialElementSpec,
}

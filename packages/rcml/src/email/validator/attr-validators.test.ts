import { describe, expect, it } from 'vitest'
import { RCML_ATTR_VALIDATORS, RcmlAttributeValidatorsEnum } from './attr-validators.js'

/**
 * Unit tests for the Zod attribute-value validators. Each `describe` block
 * samples a distinct validator class; `./attr-value-validate.ts` invokes
 * these schemas via the {@link RCML_ATTR_VALIDATORS} map at runtime.
 */

function expectAccepts(key: RcmlAttributeValidatorsEnum, value: unknown): void {
  expect(RCML_ATTR_VALIDATORS[key].safeParse(value).success).toBe(true)
}

function expectRejects(key: RcmlAttributeValidatorsEnum, value: unknown): void {
  expect(RCML_ATTR_VALIDATORS[key].safeParse(value).success).toBe(false)
}

describe('RCML_ATTR_VALIDATORS — coverage', () => {
  it('has an entry for every RcmlAttributeValidatorsEnum member', () => {
    const enumKeys = Object.values(RcmlAttributeValidatorsEnum)

    for (const k of enumKeys) {
      expect(RCML_ATTR_VALIDATORS[k]).toBeDefined()
    }
  })
})

describe('Color', () => {
  it('accepts 3-digit hex, 6-digit hex, and the transparent keyword', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Color, '#fff')
    expectAccepts(RcmlAttributeValidatorsEnum.Color, '#FF00FF')
    expectAccepts(RcmlAttributeValidatorsEnum.Color, 'transparent')
  })

  it('rejects RGB notation, named colors, and arbitrary strings', () => {
    expectRejects(RcmlAttributeValidatorsEnum.Color, 'rgb(255, 0, 0)')
    expectRejects(RcmlAttributeValidatorsEnum.Color, 'red')
    expectRejects(RcmlAttributeValidatorsEnum.Color, 'banana')
  })
})

describe('Px', () => {
  it('accepts positive pixel values and the literal 0', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Px, '10px')
    expectAccepts(RcmlAttributeValidatorsEnum.Px, '12.5px')
    expectAccepts(RcmlAttributeValidatorsEnum.Px, '0')
  })

  it('rejects em, percent, and non-unit strings', () => {
    expectRejects(RcmlAttributeValidatorsEnum.Px, '10em')
    expectRejects(RcmlAttributeValidatorsEnum.Px, '50%')
    expectRejects(RcmlAttributeValidatorsEnum.Px, 'banana')
  })
})

describe('Percentage', () => {
  it('accepts percent values and 0', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Percentage, '10%')
    expectAccepts(RcmlAttributeValidatorsEnum.Percentage, '12.5%')
    expectAccepts(RcmlAttributeValidatorsEnum.Percentage, '0')
  })

  it('rejects pixel values', () => {
    expectRejects(RcmlAttributeValidatorsEnum.Percentage, '10px')
  })
})

describe('PxOrAuto', () => {
  it('accepts pixel values and the literal auto', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.PxOrAuto, '200px')
    expectAccepts(RcmlAttributeValidatorsEnum.PxOrAuto, 'auto')
  })

  it('rejects other keywords', () => {
    expectRejects(RcmlAttributeValidatorsEnum.PxOrAuto, 'cover')
  })
})

describe('PxOrPercentage', () => {
  it('accepts pixels and percent', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.PxOrPercentage, '10px')
    expectAccepts(RcmlAttributeValidatorsEnum.PxOrPercentage, '50%')
  })
})

describe('Padding (shorthand)', () => {
  it('accepts 1 to 4 pixel values separated by spaces', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Padding, '10px')
    expectAccepts(RcmlAttributeValidatorsEnum.Padding, '10px 20px')
    expectAccepts(RcmlAttributeValidatorsEnum.Padding, '10px 20px 30px')
    expectAccepts(RcmlAttributeValidatorsEnum.Padding, '10px 20px 30px 40px')
  })

  it('rejects values that are not pixel units', () => {
    expectRejects(RcmlAttributeValidatorsEnum.Padding, 'banana')
    expectRejects(RcmlAttributeValidatorsEnum.Padding, '10em')
  })
})

describe('Border (shorthand + globals)', () => {
  it('accepts a full shorthand (width + style + color)', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Border, '1px solid #fff')
  })

  it('accepts a width-only border-style shorthand (width + style)', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Border, '2px dashed')
  })

  it('accepts a single style keyword', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Border, 'none')
  })

  it('accepts the CSS global keyword `inherit`', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Border, 'inherit')
  })

  it('rejects random strings', () => {
    expectRejects(RcmlAttributeValidatorsEnum.Border, 'banana')
  })
})

describe('BackgroundPosition', () => {
  it('accepts two keywords from different axes', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundPosition, 'top center')
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundPosition, 'left bottom')
  })

  it('accepts two percentages', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundPosition, '50% 50%')
  })

  it('rejects an identical keyword pair', () => {
    expectRejects(RcmlAttributeValidatorsEnum.BackgroundPosition, 'top top')
  })
})

describe('Enum-based validators', () => {
  it('Align rejects values outside its set', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Align, 'left')
    expectRejects(RcmlAttributeValidatorsEnum.Align, 'justify')
  })

  it('Direction only allows ltr or rtl', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Direction, 'ltr')
    expectRejects(RcmlAttributeValidatorsEnum.Direction, 'diagonal')
  })

  it('FontStyle only allows normal / italic / oblique', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.FontStyle, 'italic')
    expectRejects(RcmlAttributeValidatorsEnum.FontStyle, 'bold')
  })

  it('FontWeight only allows numeric strings 100–900', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.FontWeight, '400')
    expectRejects(RcmlAttributeValidatorsEnum.FontWeight, 'bold')
    expectRejects(RcmlAttributeValidatorsEnum.FontWeight, '1000')
  })
})

describe('PositiveNumber', () => {
  it('accepts numeric strings and JS numbers', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.PositiveNumber, '42')
    expectAccepts(RcmlAttributeValidatorsEnum.PositiveNumber, 7)
  })

  it('rejects zero, negatives, and non-numeric strings', () => {
    expectRejects(RcmlAttributeValidatorsEnum.PositiveNumber, '0')
    expectRejects(RcmlAttributeValidatorsEnum.PositiveNumber, 0)
    expectRejects(RcmlAttributeValidatorsEnum.PositiveNumber, -1)
    expectRejects(RcmlAttributeValidatorsEnum.PositiveNumber, 'banana')
  })
})

describe('BorderRadius', () => {
  it('accepts 1–4 pixel or percent values', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.BorderRadius, '4px')
    expectAccepts(RcmlAttributeValidatorsEnum.BorderRadius, '10% 20px')
    expectAccepts(RcmlAttributeValidatorsEnum.BorderRadius, '1px 2px 3px 4px')
  })

  it('rejects non-unit values', () => {
    expectRejects(RcmlAttributeValidatorsEnum.BorderRadius, '10em')
  })
})

describe('Background family', () => {
  it('BackgroundPositionX accepts keywords and percentages, rejects others', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundPositionX, 'left')
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundPositionX, '50%')
    expectRejects(RcmlAttributeValidatorsEnum.BackgroundPositionX, 'top')
  })

  it('BackgroundPositionY accepts keywords and percentages, rejects others', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundPositionY, 'top')
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundPositionY, '25%')
    expectRejects(RcmlAttributeValidatorsEnum.BackgroundPositionY, 'left')
  })

  it('BackgroundRepeat allows only repeat / no-repeat', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundRepeat, 'repeat')
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundRepeat, 'no-repeat')
    expectRejects(RcmlAttributeValidatorsEnum.BackgroundRepeat, 'tile')
  })

  it('BackgroundSize accepts keywords and length pairs, rejects 3-value forms', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundSize, 'auto')
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundSize, 'cover')
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundSize, 'contain')
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundSize, '50% 50%')
    expectAccepts(RcmlAttributeValidatorsEnum.BackgroundSize, '100px')
    expectRejects(RcmlAttributeValidatorsEnum.BackgroundSize, '1px 2px 3px')
  })

  it('BackgroundPosition rejects unknown keywords', () => {
    expectRejects(RcmlAttributeValidatorsEnum.BackgroundPosition, 'bogus bogus')
  })
})

describe('Boolean + FluidOnMobile', () => {
  it('Boolean accepts true / false, rejects strings', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Boolean, true)
    expectAccepts(RcmlAttributeValidatorsEnum.Boolean, false)
    expectRejects(RcmlAttributeValidatorsEnum.Boolean, 'true')
  })

  it('FluidOnMobile accepts the string "true" / "false" only', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.FluidOnMobile, 'true')
    expectAccepts(RcmlAttributeValidatorsEnum.FluidOnMobile, 'false')
    expectRejects(RcmlAttributeValidatorsEnum.FluidOnMobile, true)
  })
})

describe('Border family', () => {
  it('BorderStyle allows standard CSS keywords, rejects unknown', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.BorderStyle, 'solid')
    expectAccepts(RcmlAttributeValidatorsEnum.BorderStyle, 'dashed')
    expectRejects(RcmlAttributeValidatorsEnum.BorderStyle, 'wavy')
  })
})

describe('Full-width + hide-section flags', () => {
  it('FullWidth only allows full-width / false', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.FullWidth, 'full-width')
    expectAccepts(RcmlAttributeValidatorsEnum.FullWidth, 'false')
    expectRejects(RcmlAttributeValidatorsEnum.FullWidth, 'narrow')
  })

  it('HideSection only allows desktop / mobile', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.HideSection, 'desktop')
    expectAccepts(RcmlAttributeValidatorsEnum.HideSection, 'mobile')
    expectRejects(RcmlAttributeValidatorsEnum.HideSection, 'always')
  })
})

describe('Typography extras', () => {
  it('FontFamily accepts a css-style font string', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.FontFamily, "'Helvetica Neue', sans-serif")
    expectAccepts(RcmlAttributeValidatorsEnum.FontFamily, 'Arial')
  })

  it('LetterSpacing accepts px/em and negative values, rejects others', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.LetterSpacing, '2px')
    expectAccepts(RcmlAttributeValidatorsEnum.LetterSpacing, '-0.5em')
    expectRejects(RcmlAttributeValidatorsEnum.LetterSpacing, '10%')
  })

  it('TextAlign allows the four CSS keywords', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.TextAlign, 'justify')
    expectRejects(RcmlAttributeValidatorsEnum.TextAlign, 'middle')
  })

  it('TextDecoration accepts the four supported keywords', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.TextDecoration, 'underline')
    expectRejects(RcmlAttributeValidatorsEnum.TextDecoration, 'blink')
  })

  it('TextTransform accepts the three supported keywords', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.TextTransform, 'uppercase')
    expectRejects(RcmlAttributeValidatorsEnum.TextTransform, 'italic')
  })

  it('VerticalAlign accepts top / middle / bottom', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.VerticalAlign, 'middle')
    expectRejects(RcmlAttributeValidatorsEnum.VerticalAlign, 'center')
  })
})

describe('Social-icon enums', () => {
  it('SocialMode allows horizontal / vertical', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.SocialMode, 'horizontal')
    expectRejects(RcmlAttributeValidatorsEnum.SocialMode, 'grid')
  })

  it('SocialIconColor allows brand / black / white', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.SocialIconColor, 'brand')
    expectRejects(RcmlAttributeValidatorsEnum.SocialIconColor, 'grey')
  })

  it('SocialIconShape allows original / circle / square', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.SocialIconShape, 'circle')
    expectRejects(RcmlAttributeValidatorsEnum.SocialIconShape, 'hex')
  })
})

describe('Table + anchor attrs', () => {
  it('TableLayout allows auto / fixed', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.TableLayout, 'auto')
    expectRejects(RcmlAttributeValidatorsEnum.TableLayout, 'dynamic')
  })

  it('Target allows the four HTML target keywords', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Target, '_blank')
    expectAccepts(RcmlAttributeValidatorsEnum.Target, '_self')
    expectRejects(RcmlAttributeValidatorsEnum.Target, 'new-tab')
  })
})

describe('String / Url passthroughs', () => {
  it('String accepts any string', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.String, 'anything')
    expectRejects(RcmlAttributeValidatorsEnum.String, 42)
  })

  it('Url is aliased to String and accepts any string', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.Url, 'https://example.com')
    expectRejects(RcmlAttributeValidatorsEnum.Url, 99)
  })
})

describe('Case / loop control attrs', () => {
  it('CaseType allows default / segment / tag / custom-field', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.CaseType, 'segment')
    expectRejects(RcmlAttributeValidatorsEnum.CaseType, 'fallback')
  })

  it('CaseCondition allows eq / ne', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.CaseCondition, 'eq')
    expectRejects(RcmlAttributeValidatorsEnum.CaseCondition, 'gt')
  })

  it('CaseProperty accepts numbers', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.CaseProperty, 42)
    expectRejects(RcmlAttributeValidatorsEnum.CaseProperty, '42')
  })

  it('CaseValue accepts string or number', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.CaseValue, 'x')
    expectAccepts(RcmlAttributeValidatorsEnum.CaseValue, 7)
    expectRejects(RcmlAttributeValidatorsEnum.CaseValue, true)
  })

  it('CaseActive accepts booleans', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.CaseActive, true)
    expectRejects(RcmlAttributeValidatorsEnum.CaseActive, 1)
  })

  it('LoopType allows news-feed / remote-content / custom-field / xml-doc', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.LoopType, 'news-feed')
    expectAccepts(RcmlAttributeValidatorsEnum.LoopType, 'custom-field')
    expectRejects(RcmlAttributeValidatorsEnum.LoopType, 'csv')
  })

  it('LoopValue accepts string or number', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.LoopValue, 'products')
    expectAccepts(RcmlAttributeValidatorsEnum.LoopValue, 42)
    expectRejects(RcmlAttributeValidatorsEnum.LoopValue, false)
  })

  it('LoopMaxIterations accepts positive numbers', () => {
    expectAccepts(RcmlAttributeValidatorsEnum.LoopMaxIterations, 5)
    expectAccepts(RcmlAttributeValidatorsEnum.LoopMaxIterations, '10')
    expectRejects(RcmlAttributeValidatorsEnum.LoopMaxIterations, 0)
  })
})

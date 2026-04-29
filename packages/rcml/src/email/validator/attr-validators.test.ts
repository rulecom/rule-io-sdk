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

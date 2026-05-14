import * as sdk from '@rulecom/sdk';

describe('@rulecom/sdk', () => {
  it('loads without error', () => {
    expect(sdk).toBeDefined();
  });

  it('has named exports', () => {
    expect(Object.keys(sdk).length).toBeGreaterThan(0);
  });
});

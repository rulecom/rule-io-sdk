import * as sdk from '@rule-io/sdk';

describe('@rule-io/sdk', () => {
  it('loads without error', () => {
    expect(sdk).toBeDefined();
  });

  it('has named exports', () => {
    expect(Object.keys(sdk).length).toBeGreaterThan(0);
  });
});

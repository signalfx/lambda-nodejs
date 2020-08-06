const signalfxHelper = require('../signalfx-transform-helper');
const chai = require('chai');
const expect = chai.expect;

describe('signalfx-transform-helper', () => {

  it('should leave flat objects as they are', () => {
    const obj = {key1: 'value', key2: 5};
    const expected = {detail_key1: 'value', detail_key2: 5};
    const sanitizedAndPrefixed = signalfxHelper.transformDetails(obj);
    expect(sanitizedAndPrefixed).to.deep.equal(expected);
  });

  it('should stringify arrays and objects', () => {
    const obj = {key1: 'value', key2: 5, key3: {inner1: 42, inner2: 43}, key4: [2, "one"]};
    const expected = {
      detail_key1: 'value',
      detail_key2: 5,
      detail_key3: '{"inner1":42,"inner2":43}',
      detail_key4: '[2,"one"]'
    };
    const sanitizedAndPrefixed = signalfxHelper.transformDetails(obj);
    expect(sanitizedAndPrefixed).to.deep.equal(expected);
  });

});
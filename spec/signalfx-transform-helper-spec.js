const signalfxHelper = require('../signalfx-transform-helper');
const chai = require('chai');
const expect = chai.expect;

describe('signalfx-transform-helper', () => {

  it('should sanitize field names to include only a-zA-Z0-9_', () => {
    const obj = {
      id: "7bf73129-1428-4cd3-a780-95db273d1602",
      'detail-type': "EC2 Instance State-change Notification",
      detail: {'_ some _ TrIc!ky_!  _ke@y $%^1&': 'value'}
    };
    const expected = {detail___some___TrIc_ky___ke_y_1_: 'value'};
    const sanitizedAndPrefixed = signalfxHelper.extractDetailsForSfx(obj);
    expect(sanitizedAndPrefixed).to.deep.equal(expected);
  });

  it('should leave non-object parameters as is', () => {
    const obj = {
      id: "7bf73129-1428-4cd3-a780-95db273d1602",
      'detail-type': "EC2 Instance State-change Notification",
      detail: {
        key1: 'value',
        key2: 5
      }
    };
    const expected = {
      detail_key1: 'value',
      detail_key2: 5
    };
    const sanitizedAndPrefixed = signalfxHelper.extractDetailsForSfx(obj);
    expect(sanitizedAndPrefixed).to.deep.equal(expected);
  });

  it('should stringify arrays, objects, nulls and booleans', () => {
    const obj = {
      id: "7bf73129-1428-4cd3-a780-95db273d1602",
      'detail-type': "EC2 Instance State-change Notification",
      detail: {
        key1: 'value',
        key2: 5,
        "key2.1": 5.1,
        key3: {' inner1 ': 42, inner2: null},
        key4: [2, "one"],
        key5: [],
        ' key6 ': ' value space-surrounded ',
        key7: null,
        key8: true,
      }
    };
    const expected = {
      detail_key1: 'value',
      detail_key2: 5,
      detail_key2_1: 5.1,
      detail_key3: '{" inner1 ":42,"inner2":null}',
      detail_key4: '[2,"one"]',
      detail_key5: '[]',
      detail__key6_: ' value space-surrounded ',
      detail_key7: 'null',
      detail_key8: 'true',
    };
    const sanitizedAndPrefixed = signalfxHelper.extractDetailsForSfx(obj);
    expect(sanitizedAndPrefixed).to.deep.equal(expected);
  });

});
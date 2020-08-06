const signalfxHelper = require('../signalfx-transform-helper');
const chai = require('chai');
const expect = chai.expect;

describe('signalfx-transform-helper', () => {

  it('should leave flat objects as they are', () => {
    const obj = { 'key1': 'value', 'key2': 5};
    const flattened = signalfxHelper.toKeyValueMap(obj);
    expect(flattened).to.deep.equal(obj);
  });

  it('should sanitize field names to include only a-zA-Z0-9-_', () => {
    const obj = { 'IP Address': "123.45.67.89", 'field': { 'nested/object:name': 'test'}};
    const flattened = signalfxHelper.toKeyValueMap(obj);
    expect(flattened.IP_Address).to.equal("123.45.67.89");
    expect(flattened.field_nested_object_name).to.equal('test');
  });

  it('should flatten nested properties', () => {
    const obj = { key: { nestedKey: 'value', otherNestedKey: 'otherValue'}};
    const flattened = signalfxHelper.toKeyValueMap(obj);
    expect(flattened['key_nestedKey']).to.be.equal('value');
    expect(flattened['key_otherNestedKey']).to.be.equal('otherValue');
  });

  it('should handle exactly two levels of nesting', () => {
    const obj = {
      testA: 'a',
      testB: { testBB: 1},
      testC: { testCC: {testCCC: 'c', testCCCC: 3}},
      testD: { testD: 2, testDD: 'dd'}
    };
    const flattened = signalfxHelper.toKeyValueMap(obj);
    expect(flattened['testA']).to.be.equal('a');
    expect(flattened['testB_testBB']).to.be.equal(1);
    expect(flattened['testC_testCC']).to.be.equal('{"testCCC":"c","testCCCC":3}');
    expect(flattened['testD_testD']).to.be.equal(2);
    expect(flattened['testD_testDD']).to.be.equal('dd');
  });

  it('should handle arrays', () => {
    const obj = {
      resources: ['a', 'b', 'c']
    };
    const flattened = signalfxHelper.toKeyValueMap(obj);
    expect(flattened['resources_0']).to.be.equal('a');
    expect(flattened['resources_1']).to.be.equal('b');
    expect(flattened['resources_2']).to.be.equal('c');
  });

  it('should handle arrays of objects', () => {
    const obj = {
      resources: ['a', {b: 'B'}, {c: {c: {c: 'C'}}}, 'd', {e: [1,2,3]}]
    };
    const flattened = signalfxHelper.toKeyValueMap(obj);
    expect(flattened['resources_0']).to.be.equal('a');
    expect(flattened['resources_1']).to.be.equal('{"b":"B"}');
    expect(flattened['resources_2']).to.be.equal('{"c":{"c":{"c":"C"}}}');
    expect(flattened['resources_3']).to.be.equal('d');
    expect(flattened['resources_4']).to.be.equal('{"e":[1,2,3]}');
  });

  it('should handle sample Amazon event', () => {
    const event = require('./amazonAlert.json');
    const flattened = signalfxHelper.toKeyValueMap(event);
    expect(flattened['detail_risk-score']).to.be.equal(80);
    let expectedDetailSummary = JSON.stringify(require('./expectedDetailSummary.json'));
    expect(flattened['detail_summary']).to.be.equal(expectedDetailSummary);
  });

  it('should not include empty objects and fields', () => {
    const object = { details: {}, resources: [], test: {nested: {}}};
    const flattened = signalfxHelper.toKeyValueMap(object);
    expect(flattened["details"]).to.be.undefined;
    expect(flattened["resources"]).to.be.undefined;
    expect(flattened["test_nested"]).to.be.undefined;
  });

  it('should cleanup empty attributes objects and arrays recursively', () => {
    const object = {
      details: {},
      resources: [],
      test: {
        nested: {
          attr0: "",
          attr1: null,
          attr2: undefined,
          attr3: [],
          attr4: 42,
          attr5: "val",
          attrArr6: [null, undefined, "", {}],
          attrArrWithObj7: [null, undefined, "", {
            obj: {
              str: "foo",
              blk: "",
              arr: [{bad: ""}, {"ok": "bar"}]
            }
          }],
          attrObjOk8: {
              str: "foo",
          },
          attrObjBad9: {bad: ""}
        },
        nestedMixedBadArr: ["", null, undefined, {inner1: "", inner2: null}],
        nestedMixedOkArr: ["", 42, null, undefined, {inner1: "", inner2: null, inner3: "deep"}]
      }
    };
    const flattened = signalfxHelper.toKeyValueMap(object);
    expect(Object.keys(flattened).length).to.be.equal(2);
    expect(flattened["details"]).to.be.undefined;
    expect(flattened["resources"]).to.be.undefined;
    expect(flattened["test_nested"]).to.be.equal('{"attr4":42,"attr5":"val","attrArrWithObj7":[{"obj":{"str":"foo","arr":[{"ok":"bar"}]}}],"attrObjOk8":{"str":"foo"}}');
    expect(flattened["test_nestedMixedBadArr"]).to.be.undefined;
    expect(flattened["test_nestedMixedOkArr"]).to.be.equal('[42,{"inner3":"deep"}]');
  });
});
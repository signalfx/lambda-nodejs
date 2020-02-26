const signalfxHelper = require('../signalfx-transform-helper');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;

describe('signalfx-transform-helper', () => {

  it('should leave flat objects as they are', () => {
    const obj = { 'key1': 'value', 'key2': 5};
    const flattened = signalfxHelper.toKeyValueMap(obj);
    expect(flattened.key1).to.be.equal('value');
    expect(flattened.key2).to.be.equal(5);
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

  it('should handle different levels of nesting', () => {
    const obj = {
      testA: 'a',
      testB: { testBB: 1},
      testC: { testCC: {testCCC: 'c', testCCCC: 'cccc'}},
      testD: { testD: 2, testDD: 'dd'}
    };
    const flattened = signalfxHelper.toKeyValueMap(obj);
    expect(flattened['testA']).to.be.equal('a');
    expect(flattened['testB_testBB']).to.be.equal(1);
    expect(flattened['testC_testCC_testCCC']).to.be.equal('c');
    expect(flattened['testC_testCC_testCCCC']).to.be.equal('cccc');
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
    expect(flattened['resources_1_b']).to.be.equal('B');
    expect(flattened['resources_2_c_c_c']).to.be.equal('C');
    expect(flattened['resources_3']).to.be.equal('d');
    expect(flattened['resources_4_e_0']).to.be.equal(1);
    expect(flattened['resources_4_e_1']).to.be.equal(2);
    expect(flattened['resources_4_e_2']).to.be.equal(3);
  });

  it('should handle sample Amazon event', () => {
    const event = require('./amazonAlert.json');
    const flattened = signalfxHelper.toKeyValueMap(event);
    expect(flattened['detail_risk-score']).to.be.equal(80);
    expect(flattened['detail_summary_IP_34_199_185_34']).to.be.equal(121);
    expect(flattened['detail_summary_Time_Range_0_end']).to.be.equal('2017-04-24T20:25:54Z');
  });

  it('should not include empty fields', () => {
    const object = { details: {}, resources: [], test: {nested: {}}};
    const flattened = signalfxHelper.toKeyValueMap(object);
    expect(flattened).to.be.an('object').that.is.empty;
  });
});
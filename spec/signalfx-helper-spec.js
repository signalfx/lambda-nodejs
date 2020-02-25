const mock = require('mock-require');
const sinon = require('sinon');
const chai = require("chai");
const expect = chai.expect;

// mock signalfx dependency
const SEND_FUNCTION_STUB = sinon.stub().returns(Promise.resolve());

class DummyIngestJson {
  constructor() {
    this.send = SEND_FUNCTION_STUB;
  }
}

mock('signalfx', { IngestJson: DummyIngestJson});

// require helper after singalfx is mocked
const signalfxHelper = require('../signalfx-helper');


describe("signalfx-helper", () => {

  const LAMBDA_ARN = "arn:aws:lambda:us-east-2:123456789012:function:test-cw-events";
  const CONTEXT_DIMENSIONS = {sampleDimension: "test", otherDimension: "otherTest"};

  beforeEach(() => {
    signalfxHelper.setAccessToken("aaaaaaaaaaa");
    signalfxHelper.setLambdaFunctionContext({invokedFunctionArn: LAMBDA_ARN}, CONTEXT_DIMENSIONS);
  });

  it("should send a counter with correct name, value and dimension", () => {
    const METRIC_NAME = "sampleMetricName";
    const METRIC_VALUE = 10;

    signalfxHelper.sendCounter(METRIC_NAME, METRIC_VALUE, {specificDimension: "addedInTest"});
    expect(SEND_FUNCTION_STUB.calledOnce).to.be.true;

    const firstSentCounter = SEND_FUNCTION_STUB.firstCall.args[0].counters[0];

    expect(firstSentCounter.metric).to.equal(METRIC_NAME);
    expect(firstSentCounter.value).to.equal(METRIC_VALUE);
    expect(firstSentCounter.dimensions.specificDimension).to.equal('addedInTest');
    expect(firstSentCounter.dimensions.sampleDimension).to.equal('test');
    expect(firstSentCounter.dimensions.otherDimension).to.equal('otherTest');
    expect(firstSentCounter.dimensions.lambda_arn).to.equal(LAMBDA_ARN + ':');
  });
});


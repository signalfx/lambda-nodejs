const mock = require('mock-require');
const sinon = require('sinon');
const chai = require('chai');
const expect = chai.expect;

// mock signalfx dependency
const SEND_FUNCTION_STUB = sinon.stub().returns(Promise.resolve());
const SEND_EVENT_STUB = sinon.stub().returns(Promise.resolve());

class DummyIngestJson {
  constructor() {
    this.send = SEND_FUNCTION_STUB;
    this.sendEvent = SEND_EVENT_STUB;
  }
}

mock('signalfx', { IngestJson: DummyIngestJson, Ingest: DummyIngestJson});

// require helper after singalfx is mocked
const signalfxHelper = require('../signalfx-helper');


describe('signalfx-helper', () => {

  const LAMBDA_ARN = 'arn:aws:lambda:us-east-2:123456789012:function:test-cw-events';
  const CONTEXT_DIMENSIONS = {sampleDimension: 'test', otherDimension: 'otherTest'};

  beforeEach(() => {
    const meta = signalfxHelper.getExecutionMetadata({invokedFunctionArn: LAMBDA_ARN});
    signalfxHelper.setDefaultDimensions(meta, CONTEXT_DIMENSIONS);
    SEND_EVENT_STUB.resetHistory();
    SEND_FUNCTION_STUB.resetHistory();
  });

  afterEach(() => {
    delete process.env.SIGNALFX_TRACING_ENABLED;
    delete process.env.SIGNALFX_METRICS_ENABLED;
  });

  it('should use args and env vars to disable tracing/metrics', () => {
    expect(signalfxHelper.isMetricsDisabled(true)).to.equal(true);
    expect(signalfxHelper.isMetricsDisabled(false)).to.equal(false);

    expect(signalfxHelper.isTracingDisabled(true)).to.equal(true);
    expect(signalfxHelper.isTracingDisabled(false)).to.equal(false);

    process.env.SIGNALFX_METRICS_ENABLED = 'false';
    expect(signalfxHelper.isMetricsDisabled(true)).to.equal(true);
    expect(signalfxHelper.isMetricsDisabled(false)).to.equal(true);

    process.env.SIGNALFX_TRACING_ENABLED = 'false';
    expect(signalfxHelper.isTracingDisabled(true)).to.equal(true);
    expect(signalfxHelper.isTracingDisabled(false)).to.equal(true);

    process.env.SIGNALFX_METRICS_ENABLED = 'faksjdke';
    expect(signalfxHelper.isMetricsDisabled(true)).to.equal(true);
    expect(signalfxHelper.isMetricsDisabled(false)).to.equal(false);

    process.env.SIGNALFX_TRACING_ENABLED = 'f1312kse';
    expect(signalfxHelper.isTracingDisabled(true)).to.equal(true);
    expect(signalfxHelper.isTracingDisabled(false)).to.equal(false);
  });

  it('should send a counter with correct name, value and dimension', () => {
    const METRIC_NAME = 'sampleMetricName';
    const METRIC_VALUE = 10;

    signalfxHelper.sendCounter(METRIC_NAME, METRIC_VALUE, {specificDimension: 'addedInTest'});
    expect(SEND_FUNCTION_STUB.calledOnce).to.be.true;

    const firstSentCounter = SEND_FUNCTION_STUB.firstCall.args[0].counters[0];

    expect(firstSentCounter.metric).to.equal(METRIC_NAME);
    expect(firstSentCounter.value).to.equal(METRIC_VALUE);
    expect(firstSentCounter.dimensions.specificDimension).to.equal('addedInTest');
    expect(firstSentCounter.dimensions.sampleDimension).to.equal('test');
    expect(firstSentCounter.dimensions.otherDimension).to.equal('otherTest');
    expect(firstSentCounter.dimensions.lambda_arn).to.equal(LAMBDA_ARN + ':');
  });

  it('should send a custom event with no timestamp', () => {
    const DIMENSIONS = {dimension: 'one', otherDimension: 'second'};
    const PROPERTIES = {property: 'prop'};
    signalfxHelper.sendCustomEvent('testType', DIMENSIONS, PROPERTIES);
    expect(SEND_EVENT_STUB.calledOnce).to.be.true;

    const event = SEND_EVENT_STUB.firstCall.args[0]

    expect(event.eventType).to.be.equal('testType');
    expect(event.dimensions).to.be.equal(DIMENSIONS);
    expect(event.properties).to.be.equal(PROPERTIES);
    expect(event.category).to.be.equal('USER_DEFINED');
    expect(event).to.not.have.any.keys('timestamp');
  });

  it('should send a custom event with timestamp if provided', () => {
    const DIMENSIONS = {dimension: 'one', otherDimension: 'second'};
    const PROPERTIES = {property: 'prop'};
    const TIMESTAMP = 123456;
    signalfxHelper.sendCustomEvent('testType', DIMENSIONS, PROPERTIES, TIMESTAMP);
    expect(SEND_EVENT_STUB.calledOnce).to.be.true;

    const event = SEND_EVENT_STUB.firstCall.args[0]
    expect(event.timestamp).to.be.equal(TIMESTAMP);
  });

  it('should send a Cloudwatch event with Cloudwatch event type and converted timestamp', () => {
    const DETAILS = {'instance-id': 'i-a1s2d3f4g5h6j7', state: 'pending', obj: {key: 'val'} };
    const RESOURCES = [ 'arn:aws:ec2:us-east-2:123456789012:instance/i-a1s2d3f4g5h6j7' ];

    const testCwEvent = {
      version: '0',
      id: 'abcd1234-a123-b345-c456-d3f4g5h6j7',
      'detail-type': 'EC2 Instance State-change Notification',
      source: 'aws.ec2',
      account: '123456789012',
      time: '2020-02-20T11:36:21Z',
      region: 'us-east-2',
      resources: RESOURCES,
      detail: DETAILS
    };

    signalfxHelper.sendCloudWatchEvent(testCwEvent);

    expect(SEND_EVENT_STUB.calledOnce).to.be.true;
    const event = SEND_EVENT_STUB.firstCall.args[0];
    expect(event.eventType).to.be.equal('CloudWatch');
    expect(event.timestamp).to.be.equal(1582198581000);
    expect(event.properties.id).to.be.equal('abcd1234-a123-b345-c456-d3f4g5h6j7');
    expect(event.dimensions.detailType).to.be.equal('EC2 Instance State-change Notification');
    expect(event.dimensions.source).to.be.equal('aws.ec2');
    expect(event.properties['detail_instance-id']).to.be.equal('i-a1s2d3f4g5h6j7');
    expect(event.properties['detail_state']).to.be.equal('pending');
    expect(event.properties['detail_obj']).to.be.equal('{"key":"val"}');
    expect(event.properties['resources']).to.be.equal('["arn:aws:ec2:us-east-2:123456789012:instance/i-a1s2d3f4g5h6j7"]');
  });

});


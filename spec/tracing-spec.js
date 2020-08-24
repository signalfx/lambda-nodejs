const mock = require("mock-require");
const sinon = require("sinon");
const chai = require("chai");
const getPort = require("get-port");
const expect = chai.expect;

const getAgent = require("./agent");
const e = require("express");

const requestStub = sinon.stub().returns(Promise.resolve());

// mock('signalfx', { IngestJson: DummyIngestJson});
// mock('signalfx-tracing/src/zipkin/writer/ZipkinV2Writer', {_request: requestStub})

// require helper after singalfx is mocked

describe("signalfx-helper", () => {
  const NoopTracer = require("signalfx-tracing/src/noop/tracer");
  const TracerProxy = require("signalfx-tracing/src/proxy");

  let agent;
  let tracing;
  let sfx;
  let port;
  const ctx = {
    invokedFunctionArn:
      "arn:aws:lambda:us-east-2:123456789012:function:test-cw-events",
    functionName: "test-func",
    functionVersion: "2.0",
  };

  function testSpanWithError(span, err, done) {
    expect(span.name).to.equal("lambda_node_test-func");
    expect(span.localEndpoint.serviceName).to.equal("signalfx-lambda");
    if (err) {
      expect(span.tags.error).to.equal("true");
      expect(span.tags["sfx.error.kind"]).to.equal("Error");
      expect(span.tags["sfx.error.message"]).to.equal(err.message);
      expect(span.tags.lambda_arn).to.equal(ctx.invokedFunctionArn + ":2.0");
    } else {
      expect(span.tags.error).to.equal(undefined);
    }
    done();
  }

  beforeEach((done) => {
    if (!agent) {
      getPort().then((p) => {
        port = p;
        process.env.SIGNALFX_ENDPOINT_URL = `http://localhost:${port}/v1/trace`;
        sfx = mock.reRequire("../signalfx-lambda");
        tracing = mock.reRequire("../tracing");
        getAgent(port).then((a) => {
          agent = a;
          done();
        });
      });
    } else {
      done();
    }
  });

  afterEach(() => {
    agent.spans = [];
  });

  it("should return correct tracer", () => {
    let tracer = tracing.tracer();
    expect(tracer).is.instanceOf(TracerProxy);

    tracer = tracing.tracer(true);
    expect(tracer).is.instanceOf(NoopTracer);
  });

  it("should report spans with callback handler", (done) => {
    function callback(err, result) {
      expect(err).is.instanceOf(Error);
      expect(err.message).to.equal("error msg");
      expect(result).to.equal("result val");
      expect(agent.spans).to.length(1);
      const span = agent.spans[0];
      testSpanWithError(span, err, done);
    }

    sfx.wrapperTracing(function (event, ctx, callback) {
      callback(new Error("error msg"), "result val");
    })({}, ctx, callback);
  });

  it("should report spans with async handler", async (done) => {
    try {
      await sfx.asyncWrapperTracing(async function (event, ctx) {
        throw new Error("error msg async");
      })({}, ctx);
    } catch (err) {
      expect(err).is.instanceOf(Error);
      expect(err.message).to.equal("error msg async");
      expect(agent.spans).to.length(1);
      const span = agent.spans[0];
      testSpanWithError(span, err, done);
    }
  });

  it("async wrapper should return correct response", async (done) => {
    const result = await sfx.asyncWrapperTracing(async function (event, ctx) {
      return Promise.resolve("my response");
    })({}, ctx);
    expect(result).is.equal("my response");
    expect(agent.spans).to.length(1);
    const span = agent.spans[0];
    testSpanWithError(span, null, done);
  });
});

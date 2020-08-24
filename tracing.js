"use strict";

const url = require('url');

const tracing = require("signalfx-tracing");
const opentracing = require("opentracing");
const NoopTracer = require("signalfx-tracing/src/noop/tracer");

const _defaultEndpointPath = '/v1/trace';

// must init tracer here before other libraries are imported in order to apply
// auto-instrumentation patches.
let _tracer;

if ((process.env.SIGNALFX_TRACING_ENABLED || "true").toLowerCase() == "false") {
  _tracer = new NoopTracer();
} else {
  const options = {
    service:
      process.env.SIGNALFX_SERVICE_NAME || process.env.AWS_LAMBDA_FUNCTION_NAME,
  };
  if (process.env.SIGNALFX_ENDPOINT_URL) {
    const parsed = url.parse(process.env.SIGNALFX_ENDPOINT_URL); 
    if (parsed.pathname === "/") {
      parsed.pathname = _defaultEndpointPath;
    }
    options.url = url.format(parsed);
  }
  _tracer = tracing.init(options);
}

opentracing.initGlobalTracer(_tracer);

module.exports = {
  init: function(disabled) {
    if (!disabled && !process.env.SIGNALFX_ENDPOINT_URL) {
      console.warn('Tracing is not disabled but SIGNALFX_ENDPOINT_URL is not specified either');
    }
  },

  tracer: function (tracingDisabled) {
    return tracingDisabled ? new NoopTracer() : _tracer;
  },

  flush: function () {
    return _tracer.flush();
  },

  startSpan: function (tracer, event, meta) {
    const opName = "lambda_node_" + meta.aws_function_name;
    let childOf = tracer.extract(
      opentracing.FORMAT_HTTP_HEADERS,
      event.headers || {}
    );

    var span;
    if (childOf) {
      span = tracer.startSpan(opName, { childOf });
    } else {
      span = tracer.startSpan(opName);
    }

    Object.entries(meta).forEach((pair) => {
      if (pair[1]) {
        span.setTag(pair[0], pair[1]);
      }
    });
    span.setTag("span.kind", "server");
    span.setTag("component", "node-lambda-wrapper");
    return span;
  },
};

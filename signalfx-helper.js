'use strict';

const signalfx = require('signalfx');

const AUTH_TOKEN = process.env.SIGNALFX_AUTH_TOKEN;
const TIMEOUT_MS = process.env.SIGNALFX_SEND_TIMEOUT;

const INGEST_ENDPOINT = process.env.SIGNALFX_INGEST_ENDPOINT;

var CLIENT_OPTIONS = {};
if (INGEST_ENDPOINT) {
  CLIENT_OPTIONS.ingestEndpoint = INGEST_ENDPOINT
}

const timeoutMs = Number(TIMEOUT_MS);
if (!isNaN(timeoutMs)) {
  CLIENT_OPTIONS.timeout = timeoutMs;
}

var defaultDimensions;

var metricSender = new signalfx.IngestJson(AUTH_TOKEN, CLIENT_OPTIONS);
var sendPromises = [];

function sendMetric(metricName, metricType, metricValue, dimensions={}) {
  var dp = {
    metric: metricName,
    value: metricValue,
    dimensions: Object.assign({}, dimensions, defaultDimensions)
  };
  var datapoints = {};
  datapoints[metricType] = [dp];

  var sendPromise = metricSender.send(datapoints).catch((err) => {
    if (err) {
      console.log(err);
    }
  });
  sendPromises.push(sendPromise);
  return sendPromise;
}

const clearSendPromises = () => {
  sendPromises = [];
}

module.exports = {
  setLambdaFunctionContext: function setLambdaFunctionContext(context, dimensions) {
    defaultDimensions = Object.assign({}, dimensions);
    if (context) {
      defaultDimensions.lambda_arn = context.invokedFunctionArn;

      const splitted = context.invokedFunctionArn.split(':');
      if (splitted[2] === 'lambda') {
        defaultDimensions.aws_function_name = context.functionName;
        defaultDimensions.aws_function_version = context.functionVersion;

        defaultDimensions.aws_region = splitted[3];
        defaultDimensions.aws_account_id = splitted[4];

        if (splitted[5] === 'function') {
          defaultDimensions.aws_function_qualifier = splitted[7];
        } else if (splitted[5] === 'event-source-mappings') {
          defaultDimensions.event_source_mappings = splitted[6];
        }
      }
    }
  },

  sendGauge: function addGauge(metricName, metricValue, dimensions) {
    return sendMetric(metricName, 'gauges', metricValue, dimensions);
  },

  sendCounter: function addCounter(metricName, metricValue, dimensions) {
    return sendMetric(metricName, 'counters', metricValue, dimensions);
  },

  waitForAllSends: function waitForAllSends() {
    return Promise.all(sendPromises).then(clearSendPromises, clearSendPromises);
  }
}

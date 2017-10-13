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

var lambdaFunctionContext;
var lambdaFunctionDimensions;

var metricSender = new signalfx.IngestJson(AUTH_TOKEN, CLIENT_OPTIONS);
var sendPromises = [];

function sendMetric(metricName, metricType, metricValue, dimensions={}) {
  if (!lambdaFunctionDimensions && lambdaFunctionContext) {
    lambdaFunctionDimensions = {'lambda_arn': lambdaFunctionContext.invokedFunctionArn};

    const splitted = lambdaFunctionContext.invokedFunctionArn.split(':');
    if (splitted[2] === 'lambda') {
      lambdaFunctionDimensions.aws_region = splitted[3];
      lambdaFunctionDimensions.aws_account_id = splitted[4];

      if (splitted[5] === 'function') {
        lambdaFunctionDimensions.aws_function_name = splitted[6];
        lambdaFunctionDimensions.aws_function_version = splitted[7] || lambdaFunctionContext.functionVersion;
      } else if (splitted[5] === 'event-source-mappings') {
        lambdaFunctionDimensions.event_source_mappings = splitted[6];
      }
    }
  }

  Object.assign(dimensions, lambdaFunctionDimensions);
  var dp = {
    metric: metricName,
    value: metricValue,
    dimensions: dimensions
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
  setLambdaFunctionContext: function setLambdaFunctionContext(context) {
    lambdaFunctionContext = context;
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

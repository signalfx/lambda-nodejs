'use strict';

const signalfx = require('signalfx');

const AUTH_TOKEN = process.env.SIGNALFX_AUTH_TOKEN;
const TIMEOUT_MS = process.env.SIGNALFX_SEND_TIMEOUT;

const API_SCHEME = process.env.SIGNALFX_API_SCHEME;
const API_HOSTNAME = process.env.SIGNALFX_API_HOSTNAME;
const API_PORT = process.env.SIGNALFX_API_PORT;

var CLIENT_OPTIONS = {};
if (API_SCHEME && API_HOSTNAME && API_PORT) {
  CLIENT_OPTIONS.ingestEndpoint = API_SCHEME + '://' + API_HOSTNAME + ':' + API_PORT;
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

  sendCumulativeCounter: function addCumulativeCounter(metricName, metricValue, dimensions) {
    return sendMetric(metricName, 'cumulative_counters', metricValue, dimensions);
  },

  waitForAllSends: function waitForAllSends() {
    return Promise.all(sendPromises).then(clearSendPromises, clearSendPromises);
  }
}

'use strict';

const signalfx = require('signalfx');

const AUTH_TOKEN = process.env.SIGNALFX_AUTH_TOKEN;
const TIMEOUT_MS = process.env.SIGNALFX_SEND_TIMEOUT;

const API_SCHEME = process.env.SIGNALFX_API_SCHEME;
const API_HOSTNAME = process.env.SIGNALFX_API_HOSTNAME;
const API_PORT = process.env.SIGNALFX_API_PORT;

const CLIENT_OPTIONS = {
  ingestEndpoint: API_SCHEME + '://' + API_HOSTNAME + ':' + API_PORT,
  timeout: TIMEOUT_MS
};

var lambdaFunctionContext;
var lambdaFunctionColdStart;

var lambdaFunctionPromises = [];

var metricSender = new signalfx.IngestJson(AUTH_TOKEN, CLIENT_OPTIONS);

function sendMetric(metricName, metricType, metricValue, dimensions={}) {
  if (lambdaFunctionContext) {
    // TODO: do this once and not everytime we're sending metric
    // Use AWS ARN as dimension uniquely identifying Lambda function
    dimensions.sf_source = lambdaFunctionContext.invokedFunctionArn;

    const splitted = lambdaFunctionContext.invokedFunctionArn.split(':');
    if (splitted[2] === 'lambda') {
      dimensions.aws_region = splitted[3];
      dimensions.aws_account_id = splitted[4];
      if (splitted[5] === 'function') {
        dimensions.aws_lambda_function_name = splitted[6];
        dimensions.aws_lambda_function_version = splitted[7] || lambdaFunctionContext.functionVersion;
      } else if (splitted[5] === 'event-source-mappings') {
        dimensions.event_source_mappings = splitted[6];
      }
    }

    dimensions.aws_lambda_memory_limit = lambdaFunctionContext.memoryLimitInMB;
    dimensions.aws_lambda_execution_env = process.env.AWS_EXECUTION_ENV
  }

  var dp = {
    metric: metricName,
    value: metricValue,
    dimensions: dimensions
  };
  var datapoints = {};
  datapoints[metricType] = [dp];

  return metricSender.send(datapoints);
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

  waitForMetricRequests: function waitForMetricRequests() {
    return Promise.all(lambdaFunctionPromises);
  }
}

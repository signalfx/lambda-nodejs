'use strict';

const signalfx = require('signalfx');

const packageFile = require('./package.json')

const AUTH_TOKEN = process.env.SIGNALFX_AUTH_TOKEN;
const TIMEOUT_MS = process.env.SIGNALFX_SEND_TIMEOUT;

const INGEST_ENDPOINT = process.env.SIGNALFX_INGEST_ENDPOINT;

var CLIENT_OPTIONS = {};
if (INGEST_ENDPOINT) {
  CLIENT_OPTIONS.ingestEndpoint = INGEST_ENDPOINT
} else {
  CLIENT_OPTIONS.ingestEndpoint = 'https://pops.signalfx.com'
}

const timeoutMs = Number(TIMEOUT_MS);
if (!isNaN(timeoutMs)) {
  CLIENT_OPTIONS.timeout = timeoutMs;
} else {
  CLIENT_OPTIONS.timeout = 300;
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
      const splitted = context.invokedFunctionArn.split(':');
      if (splitted[2] === 'lambda') {
        defaultDimensions.aws_function_name = context.functionName;
        defaultDimensions.aws_function_version = context.functionVersion;

        defaultDimensions.aws_region = splitted[3];
        defaultDimensions.aws_account_id = splitted[4];

        if (splitted[5] === 'function') {
          defaultDimensions.aws_function_qualifier = splitted[7];
          const updatedArn = splitted.slice();
          updatedArn[7] = context.functionVersion;
          defaultDimensions.lambda_arn = updatedArn.join(':');
        } else if (splitted[5] === 'event-source-mappings') {
          defaultDimensions.event_source_mappings = splitted[6];
          defaultDimensions.lambda_arn = context.invokedFunctionArn;
        }
      }
    }
    if (process.env.AWS_EXECUTION_ENV) {
      defaultDimensions.aws_execution_env = process.env.AWS_EXECUTION_ENV;
    }
    defaultDimensions.function_wrapper_version = packageFile.name + '-' + packageFile.version;
    defaultDimensions.metric_source = 'lambda_wrapper';
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

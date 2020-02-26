'use strict';

const signalfx = require('signalfx');
const toKeyValueMap = require('./signalfx-transform-helper').toKeyValueMap;

const packageFile = require('./package.json');

const AUTH_TOKEN = process.env.SIGNALFX_AUTH_TOKEN;
const TIMEOUT_MS = process.env.SIGNALFX_SEND_TIMEOUT;

const INGEST_ENDPOINT = process.env.SIGNALFX_INGEST_ENDPOINT;

const CLOUDWATCH_EVENT_TYPE = 'Cloudwatch';

const CLIENT_OPTIONS = {};
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

const clearSendPromises = () => {
  sendPromises = [];
};

let defaultDimensions, metricSender;

let sendPromises = [];

function handleSend(sendPromise){
  return sendPromise.catch((err) => {
    if (err) {
      console.error('Could not send data to SignalFx!', err);
    }
  }).then(() => sendPromises.push(sendPromise));
}

function sendMetric(metricName, metricType, metricValue, dimensions={}) {
  var dp = {
    metric: metricName,
    value: metricValue,
    dimensions: Object.assign({}, dimensions, defaultDimensions)
  };
  var datapoints = {};
  datapoints[metricType] = [dp];

  return handleSend(metricSender.send(datapoints));
}

function sendCustomizedEvent(type, dimensions, properties, timestamp) {
  let event = {
    category: 'USER_DEFINED',
    eventType: type,
    dimensions: dimensions,
    properties: properties
  };

  if (timestamp) {
    event = Object.assign(event, {timestamp: timestamp});
  }

  return handleSend(metricSender.sendEvent(event));
}

function toUnixTime(dateString) {
  return new Date(dateString).getTime();
}

function sendCWEvent(cwEvent) {
  let details, resources;

  try {
    details = toKeyValueMap({detail: cwEvent.detail});
    resources = toKeyValueMap({resources: cwEvent.resources});
  } catch (err) {
    console.error('Unable to convert details or resources to a key value map. They wont be included in the event.', err);
  }

  let sfxEvent = {
    category: 'USER_DEFINED',
    eventType: CLOUDWATCH_EVENT_TYPE,
    dimensions: {region: cwEvent.region, account: cwEvent.account, 'detail-type': cwEvent['detail-type'], source: cwEvent.source},
    properties: Object.assign({id: cwEvent.id, version: cwEvent.version}, details, resources),
    timestamp: toUnixTime(cwEvent.time)
  };

  return handleSend(metricSender.sendEvent(sfxEvent));
}

function setAccessToken(accessToken) {
  metricSender = new signalfx.IngestJson(accessToken || AUTH_TOKEN, CLIENT_OPTIONS);
}

module.exports = {
  setAccessToken: setAccessToken,
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

  sendCustomEvent: function sendCustomEvent(type, dimensions, properties, timestamp) {
    return sendCustomizedEvent(type, dimensions, properties, timestamp);
  },

  sendCloudwatchEvent: function sendCloudwatchEvent(cwevent) {
    return sendCWEvent(cwevent);
  },

  waitForAllSends: function waitForAllSends() {
    return Promise.all(sendPromises).then(clearSendPromises, clearSendPromises);
  }
};

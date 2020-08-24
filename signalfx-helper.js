"use strict";

const signalfx = require("signalfx");
const extractDetailsForSfx = require("./signalfx-transform-helper")
  .extractDetailsForSfx;

const packageFile = require("./package.json");

let ACCESS_TOKEN = process.env.SIGNALFX_ACCESS_TOKEN;
if (!ACCESS_TOKEN && process.env.SIGNALFX_AUTH_TOKEN) {
  console.log('SIGNALFX_AUTH_TOKEN is deprecated. Please use SIGNALFX_ACCESS_TOKEN instead');
  ACCESS_TOKEN = process.env.SIGNALFX_AUTH_TOKEN;
}

let METRICS_INGEST_ENDPOINT = process.env.SIGNALFX_METRICS_URL || process.env.SIGNALFX_ENDPOINT_URL;
if (!METRICS_INGEST_ENDPOINT && process.env.SIGNALFX_INGEST_ENDPOINT) {
  console.log('SIGNALFX_INGEST_ENDPOINT is deprecated. Please use SIGNALFX_ENDPOINT_URL instead');
  METRICS_INGEST_ENDPOINT = process.env.SIGNALFX_INGEST_ENDPOINT;
}

const TIMEOUT_MS = process.env.SIGNALFX_SEND_TIMEOUT;

const CLOUDWATCH_EVENT_TYPE = "CloudWatch";

const CLIENT_OPTIONS = {};
if (METRICS_INGEST_ENDPOINT) {
  CLIENT_OPTIONS.ingestEndpoint = METRICS_INGEST_ENDPOINT;
} else {
  CLIENT_OPTIONS.ingestEndpoint = "https://pops.signalfx.com";
}

const timeoutMs = Number(TIMEOUT_MS);
if (!isNaN(timeoutMs)) {
  CLIENT_OPTIONS.timeout = timeoutMs;
} else {
  CLIENT_OPTIONS.timeout = 300;
}

let defaultDimensions;
let sendPromises = [];

const metricSender = new signalfx.IngestJson(ACCESS_TOKEN, CLIENT_OPTIONS);

function handleSend(sendPromise) {
  sendPromises.push(sendPromise);
  return sendPromise.catch((err) => {
    if (err) {
      console.error("Could not send data to SignalFx!", err);
    }
  });
}

function clearSendPromises() {
  sendPromises = [];
}

function sendMetric(metricName, metricType, metricValue, dimensions = {}) {
  var dp = {
    metric: metricName,
    value: metricValue,
    dimensions: Object.assign({}, dimensions, defaultDimensions),
  };
  var datapoints = {};
  datapoints[metricType] = [dp];

  return handleSend(metricSender.send(datapoints));
}

function sendCustomizedEvent(eventType, dimensions, properties, timestamp) {
  let event = {
    category: "USER_DEFINED",
    eventType,
    dimensions,
    properties,
  };

  if (timestamp) {
    event = Object.assign(event, { timestamp });
  }

  return handleSend(metricSender.sendEvent(event));
}

function toUnixTime(dateString) {
  return new Date(dateString).getTime();
}

function sendCWEvent(cwEvent) {
  let detailsMap;

  try {
    detailsMap = extractDetailsForSfx(cwEvent);
  } catch (err) {
    console.error(
      "Unable to convert details. They wont be included in the event.",
      err
    );
  }

  let sfxEvent = {
    category: "USER_DEFINED",
    eventType: CLOUDWATCH_EVENT_TYPE,
    dimensions: {
      region: cwEvent.region,
      account: cwEvent.account,
      detailType: cwEvent["detail-type"],
      source: cwEvent.source,
    },
    properties: Object.assign(
      { id: cwEvent.id, version: cwEvent.version },
      detailsMap,
      { resources: JSON.stringify(cwEvent.resources) }
    ),
    timestamp: toUnixTime(cwEvent.time),
  };

  return handleSend(metricSender.sendEvent(sfxEvent));
}

module.exports = {
  setDefaultDimensions: function (dimensions, meta) {
    defaultDimensions = Object.assign({}, dimensions, meta);
    defaultDimensions.metric_source = "lambda_wrapper";
  },

  getExecutionMetadata: function (context) {
    const meta = {};
    if (!context) {
      return meta;
    }

    const splitted = context.invokedFunctionArn.split(":");
    if (splitted[2] === "lambda") {
      meta.aws_function_name = context.functionName;
      meta.aws_function_version = context.functionVersion;

      meta.aws_region = splitted[3];
      meta.aws_account_id = splitted[4];

      if (splitted[5] === "function") {
        meta.aws_function_qualifier = splitted[7];
        const updatedArn = splitted.slice();
        updatedArn[7] = context.functionVersion;
        meta.lambda_arn = updatedArn.join(":");
      } else if (splitted[5] === "event-source-mappings") {
        meta.event_source_mappings = splitted[6];
        meta.lambda_arn = context.invokedFunctionArn;
      }
    }

    if (process.env.AWS_EXECUTION_ENV) {
      meta.aws_execution_env = process.env.AWS_EXECUTION_ENV;
    }
    meta.function_wrapper_version =
      packageFile.name + "-" + packageFile.version;
    return meta;
  },

  sendGauge: function addGauge(metricName, metricValue, dimensions) {
    return sendMetric(metricName, "gauges", metricValue, dimensions);
  },

  sendCounter: function addCounter(metricName, metricValue, dimensions) {
    return sendMetric(metricName, "counters", metricValue, dimensions);
  },

  sendCustomEvent: function sendCustomEvent(
    type,
    dimensions,
    properties,
    timestamp
  ) {
    return sendCustomizedEvent(type, dimensions, properties, timestamp);
  },

  sendCloudWatchEvent: function sendCloudWatchEvent(cwevent) {
    return sendCWEvent(cwevent);
  },

  waitForAllSends: function waitForAllSends() {
    return Promise.all(sendPromises).then(clearSendPromises, clearSendPromises);
  },

  isMetricsDisabled: function (disabled) {
    if (disabled) {
      return true;
    }
    return (
      (process.env.SIGNALFX_METRICS_ENABLED || "true").toLowerCase() === "false"
    );
  },

  isTracingDisabled: function (disabled) {
    if (disabled) {
      return true;
    }
    return (
      (process.env.SIGNALFX_TRACING_ENABLED || "true").toLowerCase() === "false"
    );
  },
};

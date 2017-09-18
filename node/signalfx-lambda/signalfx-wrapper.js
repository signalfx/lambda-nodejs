'use strict';

const signalfx = require('signalfx');
const sfxHelper = require('./signalfx-helper');

const AUTH_TOKEN = process.env.SIGNALFX_AUTH_TOKEN;
const TIMEOUT_MS = process.env.SIGNALFX_SEND_TIMEOUT;

const API_SCHEME = process.env.SIGNALFX_API_SCHEME;
const API_HOSTNAME = process.env.SIGNALFX_API_HOSTNAME;
const API_PORT = process.env.SIGNALFX_API_PORT;

const CLIENT_OPTIONS = {
  ingestEndpoint: API_SCHEME + '://' + API_HOSTNAME + ':' + API_PORT
};
if (TIMEOUT_MS) {
  CLIENT_OPTIONS.timeout = TIMEOUT_MS;
}

var coldStart = true;

class SignalFxWrapper {
  constructor(
    originalObj,
    originalFn,
    originalEvent,
    originalContext,
    originalCallback
  ) {
    this.originalObj = originalObj;
    this.originalFn = originalFn;
    this.originalEvent = originalEvent;
    this.originalContext = originalContext;
    this.originalCallback = originalCallback;

    sfxHelper.setLambdaFunctionContext(this.originalContext);
    sfxHelper.sendCounter('aws.lambda.invocation', 1);
    if (coldStart) {
      sfxHelper.sendCounter('aws.lambda.coldStart', 1);
      coldStart = false;
    }
    return this;
  }

  invoke() {
    var exception, error, message;

    const startTime = new Date().getTime();

    const customCallback = (err, msg) => {
      error = err;
      message = msg;
    }

    try {
      this.originalFn.call(
        this.originalObj,
        this.originalEvent,
        this.originalContext,
        customCallback
      );
    } catch (err) {
      sfxHelper.sendCounter('aws.lambda.error', 1);
      exception = err;
    } finally {
      sfxHelper.sendGauge('aws.lambda.executionTime', new Date().getTime() - startTime);
      sfxHelper.sendCounter('aws.lambda.complete', 1);

      const after = () => {
        if (exception) {
          // throw exception;
          this.originalCallback(error, "Exception was thrown");
        }
        this.originalCallback(error, message);
      }
      sfxHelper.waitForMetricRequests().then(after, after);
    }
  }
}

module.exports = originalFn => {
  return function customHandler(
    originalEvent,
    originalContext,
    originalCallback
  ) {
    var originalObj = this;
    return new SignalFxWrapper(
      originalObj,
      originalFn,
      originalEvent,
      originalContext,
      originalCallback
    ).invoke();
  };
};

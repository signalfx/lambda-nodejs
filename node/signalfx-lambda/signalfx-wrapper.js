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
    customFn,
    customEvent,
    customContext,
    customCallback
  ) {
    this.originalObj = originalObj;
    this.customFn = customFn;
    this.customEvent = customEvent;
    this.customContext = customContext;
    this.customCallback = customCallback;

    sfxHelper.setLambdaFunctionContext(this.customContext);
    sfxHelper.sendCounter('aws.lambda.invocation', 1);
    if (coldStart) {
      sfxHelper.sendCounter('aws.lambda.coldStart', 1);
      coldStart = false;
    }
    return this;
  }

  invoke() {
    var retval;
    var error;

    const startTime = new Date().getTime();

    try {
      retval = this.customFn.call(
        this.originalObj,
        this.customEvent,
        this.customContext,
        this.customCallback
      );
    } catch (err) {
      sfxHelper.sendCounter('aws.lambda.error', 1);
      error = err;
    } finally {
      sfxHelper.sendGauge('aws.lambda.executionTime', new Date().getTime() - startTime);
      sfxHelper.sendCounter('aws.lambda.complete', 1);

      if (error) {
        throw error;
      }
      const after = () => {
        return retval;
      }
      return sfxHelper.waitForMetricRequests(after, after);
    }
  }
}

module.exports = customFn => {
  return function customHandler(
    customEvent,
    customContext,
    customCallback
  ) {
    var originalObj = this;
    return new SignalFxWrapper(
      originalObj,
      customFn,
      customEvent,
      customContext,
      customCallback
    ).invoke();
  };
};

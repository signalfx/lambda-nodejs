'use strict';

const sfxHelper = require('./signalfx-helper');

var coldStart = true;

class SignalFxWrapper {
  constructor(
    originalObj,
    originalFn,
    originalEvent,
    originalContext,
    originalCallback,
    dimensions
  ) {
    this.originalObj = originalObj;
    this.originalFn = originalFn;
    this.originalEvent = originalEvent;
    this.originalContext = originalContext;
    this.originalCallback = originalCallback;

    sfxHelper.setLambdaFunctionContext(this.originalContext, dimensions);
    sfxHelper.sendCounter('function.invocations', 1);
    if (coldStart) {
      sfxHelper.sendCounter('function.cold_starts', 1);
      coldStart = false;
    }
    return this;
  }

  invoke() {
    var exception, error, message, callbackProcessed;

    const startTime = new Date().getTime();

    const processCallback = () => {
      if (callbackProcessed) {
        return;
      }
      callbackProcessed = true;
      sfxHelper.sendGauge('function.duration', new Date().getTime() - startTime);

      const runCallback = () => {
        if (exception) {
          this.originalCallback(exception, 'Exception was thrown');
        }
        this.originalCallback(error, message);
      }
      sfxHelper.waitForAllSends().then(runCallback, runCallback);
    }

    const customCallback = (err, msg) => {
      error = err;
      message = msg;
      processCallback();
    }

    try {
      this.originalFn.call(
        this.originalObj,
        this.originalEvent,
        this.originalContext,
        customCallback
      );
    } catch (err) {
      sfxHelper.sendCounter('function.errors', 1);
      exception = err;
      processCallback();
    }
  }
}

module.exports = (originalFn, dimensions) => {
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
      originalCallback,
      dimensions
    ).invoke();
  };
};

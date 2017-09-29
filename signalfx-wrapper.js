'use strict';

const sfxHelper = require('./signalfx-helper');

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
    sfxHelper.sendCounter('aws.lambda.invocations', 1);
    if (coldStart) {
      sfxHelper.sendCounter('aws.lambda.coldStarts', 1);
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
      sfxHelper.sendCounter('aws.lambda.errors', 1);
      exception = err;
    } finally {
      sfxHelper.sendGauge('aws.lambda.duration', new Date().getTime() - startTime);
      sfxHelper.sendCounter('aws.lambda.completed', 1);

      const runCallback = () => {
        if (exception) {
          this.originalCallback(exception, 'Exception was thrown');
        }
        this.originalCallback(error, message);
      }
      sfxHelper.waitForAllSends().then(runCallback, runCallback);
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

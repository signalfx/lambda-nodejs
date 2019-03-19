'use strict';

const sfxHelper = require('./signalfx-helper');

let coldStart = true;

class SignalFxWrapper {
  constructor(
    originalObj,
    originalFn,
    originalEvent,
    originalContext,
    dimensions,
    accessToken
  ) {
    this.originalObj = originalObj;
    this.originalFn = originalFn;
    this.originalEvent = originalEvent;
    this.originalContext = originalContext;

    sfxHelper.setAccessToken(accessToken);
    sfxHelper.setLambdaFunctionContext(this.originalContext, dimensions);
    sfxHelper.sendCounter('function.invocations', 1);
    if (coldStart) {
      sfxHelper.sendCounter('function.cold_starts', 1);
      coldStart = false;
    }
    return this;
  }

  async invoke() {
    let callbackProcessed;
    const startTime = new Date().getTime();

    const processCallback = async () => {
      if (callbackProcessed) {
        return;
      }
      callbackProcessed = true;
      sfxHelper.sendGauge('function.duration', new Date().getTime() - startTime);

      await sfxHelper.waitForAllSends();
    }

    let result;
    try {
      result = await this.originalFn.call(
        this.originalObj,
        this.originalEvent,
        this.originalContext
      );

      await processCallback();
    } catch (err) {
      sfxHelper.sendCounter('function.errors', 1);
      await processCallback();

      // should just return js exception instead of doing additional processing: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
      return err;
    }

    return result;
  }
}

module.exports = (originalFn, dimensions, accessToken) => {
  return async function (originalEvent, originalContext) {
    const self = this;

    const signalFxWrapper = new SignalFxWrapper(
      self,
      originalFn,
      originalEvent,
      originalContext,
      dimensions,
      accessToken
    );

    const result = await signalFxWrapper.invoke();
    return result;
  }
};

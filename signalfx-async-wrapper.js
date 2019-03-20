'use strict';

const sfxHelper = require('./signalfx-helper');

let coldStart = true;

class SignalFxWrapper {
  constructor(
    originalObj,
    originalFn,
    originalEvent,
    originalContext,
    originalCallback,
    dimensions,
    accessToken
  ) {
    this.originalObj = originalObj;
    this.originalFn = originalFn;
    this.originalEvent = originalEvent;
    this.originalContext = originalContext;
    this.originalCallback = originalCallback;

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
    const startTime = new Date().getTime();
    let sent;
    const sendDuration = async () => {
      if (sent) {
        return;
      }

      sfxHelper.sendGauge('function.duration', new Date().getTime() - startTime);
      sent = true;

      await sfxHelper.waitForAllSends();
    }

    const callbackWrapper = (err, result) => {
      sendDuration().then(() => {
        this.originalCallback(err, result);
      })
    };

    let result;
    try {
      result = await this.originalFn.call(
        this.originalObj,
        this.originalEvent,
        this.originalContext,
        callbackWrapper
      );

      await sendDuration();
    } catch (err) {
      sfxHelper.sendCounter('function.errors', 1);
      await sendDuration();

      // should just return js exception instead of doing additional processing: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
      return err;
    }

    return result;
  }
}

module.exports = (originalFn, dimensions, accessToken) => {
  return async function (originalEvent, originalContext, originalCallback) {
    const self = this;

    const signalFxWrapper = new SignalFxWrapper(
      self,
      originalFn,
      originalEvent,
      originalContext,
      originalCallback,
      dimensions,
      accessToken
    );

    const result = await signalFxWrapper.invoke();
    return result;
  }
};
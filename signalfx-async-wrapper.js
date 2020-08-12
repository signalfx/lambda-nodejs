"use strict";

var tracing = require("./tracing");
const sfxHelper = require("./signalfx-helper");
const noopMetricSender = require("./noop-metric-helpers");

let coldStart = true;

class SignalFxWrapper {
  constructor(
    originalObj,
    originalFn,
    originalEvent,
    originalContext,
    originalCallback,
    dimensions,
    disableTracing,
    disableMetrics
  ) {
    this.originalObj = originalObj;
    this.originalFn = originalFn;
    this.originalEvent = originalEvent;
    this.originalContext = originalContext;
    this.originalCallback = originalCallback;
    this.disableMetrics = sfxHelper.isMetricsDisabled(disableMetrics);
    this.disableTracing = sfxHelper.isTracingDisabled(disableTracing);

    tracing.init(this.disableTracing);
    this.metricSender = sfxHelper;
    if (this.disableMetrics) {
      this.metricSender = noopMetricSender;
    }

    this.execMeta = sfxHelper.getExecutionMetadata(this.originalContext);
    sfxHelper.setDefaultDimensions(dimensions, this.execMeta);

    this.metricSender.sendCounter("function.invocations", 1);
    if (coldStart) {
      this.metricSender.sendCounter("function.cold_starts", 1);
      coldStart = false;
    }
    return this;
  }

  async invoke() {
    const tracer = tracing.tracer(this.disableTracing);
    const span = tracing.startSpan(tracer, this.originalEvent, this.execMeta);

    const startTime = new Date().getTime();
    let sent;
    const flush = async () => {
      if (sent) {
        return;
      }

      this.metricSender.sendGauge(
        "function.duration",
        new Date().getTime() - startTime
      );
      sent = true;

      await Promise.all([tracing.flush(), sfxHelper.waitForAllSends()]);
    };

    const callbackWrapper = (err, result) => {
      flush().then(() => {
        this.originalCallback(err, result);
      });
    };

    return tracer.scope().activate(span, async () => {
      try {
        return await this.originalFn.call(
          this.originalObj,
          this.originalEvent,
          this.originalContext,
          callbackWrapper
        );
      } catch (err) {
        this.metricSender.sendCounter("function.errors", 1);
        span.addTags({
          "sfx.error.kind": err.name,
          "sfx.error.message": err.message,
          "sfx.error.stack": err.stack,
        });
        throw err;
      } finally {
        span.finish();
        await flush();
      }
    });
  }
}

module.exports = (originalFn, dimensions, disableTracing, disableMetrics) => {
  return async function (originalEvent, originalContext, originalCallback) {
    const self = this;

    const signalFxWrapper = new SignalFxWrapper(
      self,
      originalFn,
      originalEvent,
      originalContext,
      originalCallback,
      dimensions,
      disableTracing,
      disableMetrics
    );

    const result = await signalFxWrapper.invoke();
    return result;
  };
};

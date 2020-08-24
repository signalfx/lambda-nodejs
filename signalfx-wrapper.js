"use strict";

var tracing = require("./tracing");
const sfxHelper = require("./signalfx-helper");
const noopMetricSender = require("./noop-metric-helpers");

var coldStart = true;

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

  invoke() {
    var exception, error, message, callbackProcessed;

    const tracer = tracing.tracer(this.disableTracing);
    const span = tracing.startSpan(tracer, this.originalEvent, this.execMeta);

    const startTime = new Date().getTime();

    const processCallback = () => {
      if (callbackProcessed) {
        return;
      }
      callbackProcessed = true;
      this.metricSender.sendGauge(
        "function.duration",
        new Date().getTime() - startTime
      );

      const err = exception || error;
      if (err) {
        span.addTags({
          "sfx.error.kind": err.name,
          "sfx.error.message": err.message,
          "sfx.error.stack": err.stack,
        });
      }

      const runCallback = () => {
        if (exception) {
          this.originalCallback(exception, "Exception was thrown");
        }
        this.originalCallback(error, message);
      };

      span.finish();

      Promise.all([tracing.flush(), sfxHelper.waitForAllSends()]).then(
        runCallback,
        runCallback
      );
    };

    const customCallback = (err, msg) => {
      error = err;
      message = msg;
      processCallback();
    };

    tracer.scope().activate(span, () => {
      try {
        this.originalFn.call(
          this.originalObj,
          this.originalEvent,
          this.originalContext,
          customCallback
        );
      } catch (err) {
        this.metricSender.sendCounter('function.errors', 1);
        exception = err;
        processCallback();
      }
    });
  }
}

module.exports = (originalFn, dimensions, disableTracing, disableMetrics) => {
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
      dimensions,
      disableTracing,
      disableMetrics
    ).invoke();
  };
};

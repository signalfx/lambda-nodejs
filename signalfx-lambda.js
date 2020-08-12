"use strict";

const sfxHelper = require("./signalfx-helper");
const sfxAsyncWrapper = require("./signalfx-async-wrapper");
const sfxWrapper = require("./signalfx-wrapper");

module.exports = {
  wrapper: sfxWrapper,
  wrapperTracing: (originalFn, dimensions) => {
    return sfxWrapper(originalFn, dimensions, false, true);
  },
  wrapperMetrics: (originalFn, dimensions) => {
    return sfxWrapper(originalFn, dimensions, true, false);
  },
  asyncWrapper: sfxAsyncWrapper,
  asyncWrapperTracing: (originalFn, dimensions) => {
    return sfxAsyncWrapper(originalFn, dimensions, false, true);
  },
  asyncWrapperMetrics: (originalFn, dimensions) => {
    return sfxAsyncWrapper(originalFn, dimensions, true, false);
  },
  helper: sfxHelper,
};

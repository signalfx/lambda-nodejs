'use strict';

const signalFxLambda = require('./signalfx-lambda');

exports.handler = signalFxLambda.wrapper((event, context, callback) => {
  console.log(event.my_test_value);
  const performance = Math.random();
  signalFxLambda.helper.sendGauge('application.performance', performance);
  console.log('Custom app metric is ' + performance);
  // callback('this is the failure');
  setTimeout(function() {
  	callback(null, 'this is the result returned');
  }, 1000);
});

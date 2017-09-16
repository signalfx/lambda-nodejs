'use strict';

const signalFxLambda = require('./signalfx-lambda');

exports.handler = signalFxLambda.wrapper((event, context, callback) => {
    const performance = Math.random();
    signalFxLambda.helper.sendGauge('application.performance', performance);
    console.log('Custom app metric is ' + performance);
});

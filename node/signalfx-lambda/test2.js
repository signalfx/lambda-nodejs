'use strict';

const signalFxLambda = require('./signalfx-lambda');

console.log('Loading function');

function getState(event) {
	let state = {
			sleepDuration: parseInt(event.sleepDuration || "0"),
	}
	return state;
}

exports.handler = signalFxLambda.wrapper((event, context, callback) => {
    signalFxLambda.helper.sendGauge('application.performance', state.sleepDuration);
    console.log('Custom app metric is ' + state.sleepDuration);
});

'use strict';

const signalFxLambda = require('./signalfx-lambda');

var AWS = require('aws-sdk');
var lambda = new AWS.Lambda();

console.log('Loading function');

function sleepFor(sleepFor) {
    const now = new Date().getTime();
    const endTime = now + sleepFor;
    while(endTime > (new Date().getTime())) {
        
    }
}

function getState(event) {
	let state = {
			sleepDuration: parseInt(event.sleepDuration || "0"),
	}
	return state;
}

function reinvoke(sleepDuration) {
    let reinvokeParameters = {
            FunctionName: 'DemoAppMetrics',
            InvocationType: 'RequestResponse',
            Payload: JSON.stringify({sleepDuration: sleepDuration})
    };
    // console.log("Re-invoking lambda: ", sleepDuration);
    var rq = lambda.invoke(reinvokeParameters);
    rq.send();
}

function getSleepDuration() {
    return Math.ceil(Math.random() * 500) + 50;
}

exports.handler = signalFxLambda.wrapper((event, context, callback) => {
	let state = getState(event);

    let startTime = new Date().getTime();
    let endTime = startTime + 60000;
    let totalSlept = 0;
    let totalInvocations = 0;

    function getPromise() {
        // console.log(totalInvocations++);
        const sleepDuration = getSleepDuration();
        return signalFxLambda.helper.sendGauge('application.performance', sleepDuration).then(() => {
                reinvoke(sleepDuration)
                sleepFor(sleepDuration);
                // console.log('slept');
                // console.log(endTime);
                // console.log(new Date().getTime());
                if (new Date().getTime() <= endTime) {
                    currentPromise = currentPromise.then(getPromise());
                }
            });
    }

    var currentPromise = getPromise();
});

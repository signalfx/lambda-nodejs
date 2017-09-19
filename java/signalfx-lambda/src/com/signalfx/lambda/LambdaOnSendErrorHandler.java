package com.signalfx.lambda;

import com.amazonaws.services.lambda.runtime.Context;
import com.signalfx.metrics.errorhandler.MetricError;

public interface LambdaOnSendErrorHandler {
    void handleError(MetricError metricError, Context context);
}

package example;

import com.amazonaws.services.lambda.runtime.Context;
import com.signalfx.metrics.errorhandler.MetricError;

public interface LambdaOnSendErrorHandler {
    public void handleError(MetricError metricError, Context context);
}

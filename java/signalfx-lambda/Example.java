package example;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import com.amazonaws.services.lambda.runtime.Context;
import com.signalfx.metrics.errorhandler.MetricError;
import com.signalfx.metrics.flush.AggregateMetricSender;

public class Example {

    /**
     * 
     * @param event
     * @param context
     * @return
     */
    public Boolean myHandler(Map<String, String> event, Context context) {
        SignalFxLambdaMetricSender mf = new SignalFxLambdaMetricSender(new MyOnErrorHandler(), context);

        try (AggregateMetricSender.Session session = mf.createSession()) {
            // PUT LAMBDA FUNCTION CODE HERE. EXAMPLE:
            Map<String, String> dimensions = new HashMap<String, String>();
            dimensions.put("host", "127.0.0.1");
            mf.addGauge("gauge.thing.foo", 12, dimensions, session);
            mf.addCounter("counter.thing.baz", 23, dimensions, session);
            mf.addCumulativeCounter("cumulative.thing.baz", 34, dimensions, session);
        } catch (IOException e) {
            // Pass
        }
        return Boolean.TRUE;
    }

    private static class MyOnErrorHandler implements LambdaOnSendErrorHandler {
        @Override
        public void handleError(MetricError metricError, Context context) {
            // PUT ERROR HANDLING HERE. EXAMPLE:
            context.getLogger().log("Unable to POST metrics: " + metricError.getMessage() + "\n");
        }
    } 
}

package example;

import java.util.Collections;
import java.util.Map;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.LambdaLogger;
import com.signalfx.endpoint.SignalFxEndpoint;
import com.signalfx.endpoint.SignalFxReceiverEndpoint;
import com.signalfx.metrics.auth.StaticAuthToken;
import com.signalfx.metrics.connection.HttpDataPointProtobufReceiverFactory;
import com.signalfx.metrics.connection.HttpEventProtobufReceiverFactory;
import com.signalfx.metrics.errorhandler.MetricError;
import com.signalfx.metrics.errorhandler.OnSendErrorHandler;
import com.signalfx.metrics.flush.AggregateMetricSender;
import com.signalfx.metrics.flush.AggregateMetricSender.Session;
import com.signalfx.metrics.protobuf.SignalFxProtocolBuffers;

public class SignalFxLambdaMetricSender {
    private static final String AUTH_TOKEN = "SIGNALFX_AUTH_TOKEN";
    private static final String TIMEOUT_MS = "SIGNALFX_SEND_TIMEOUT";

    private static final String API_SCHEME = "SIGNALFX_API_SCHEME";
    private static final String API_HOSTNAME = "SIGNALFX_API_HOSTNAME";
    private static final String API_PORT = "SIGNALFX_API_PORT";

    private static String functionArn;

    private AggregateMetricSender mf;

    public SignalFxLambdaMetricSender(final LambdaOnSendErrorHandler errorHandler, final Context context) {
        // TODO(jwy): Send datapoints for -
        // aws.lambda.invocation counter
        // aws.lambda.coldStart counter
        // aws.lambda.executionTime gauge
        // aws.lambda.complete counter
        // aws.lambda.error counter
        LambdaLogger logger = context.getLogger();
        
        // Get authentication token and send timeout from environment variables
        final String authToken = System.getenv(AUTH_TOKEN);
        final String timeoutMs = System.getenv(TIMEOUT_MS);

        // Get ingest URL from environment variables
        final String apiScheme = System.getenv(API_SCHEME);
        final String apiHostname = System.getenv(API_HOSTNAME);
        final String apiPort  = System.getenv(API_PORT);

        functionArn = context.getInvokedFunctionArn();
        
        // Create endpoint for ingest URL
        SignalFxReceiverEndpoint signalFxEndpoint;
        try {
            int apiPortNum = Integer.valueOf(apiPort);
            signalFxEndpoint = new SignalFxEndpoint(apiScheme, apiHostname, apiPortNum);
        } catch (Exception e) {
            logger.log("Could not parse " + API_PORT + " value (using default instead): " + apiPort);
            signalFxEndpoint = new SignalFxEndpoint();
        }

        // Create datapoint receiver for endpoint
        HttpDataPointProtobufReceiverFactory receiver = new HttpDataPointProtobufReceiverFactory(signalFxEndpoint)
                .setVersion(2);
        if (timeoutMs != null && timeoutMs.length() != 0) {
            try {
                receiver.setTimeoutMs(Integer.valueOf(timeoutMs));
            } catch (Exception e) {
                logger.log("Could not parse " + TIMEOUT_MS + " value (using default instead): " + timeoutMs + "\n");
            }
        }
        
        // Create datapoint sender
        mf = new AggregateMetricSender("",
                receiver,
                new HttpEventProtobufReceiverFactory(signalFxEndpoint),
                new StaticAuthToken(authToken),
                Collections.<OnSendErrorHandler> singleton(new OnSendErrorHandler() {
                    @Override
                    public void handleError(MetricError metricError) {
                       if (errorHandler != null) {
                           errorHandler.handleError(metricError, context);
                       }
                    }
                }));
    }

    public Session createSession() {
        return mf.createSession();
    }

    private static SignalFxProtocolBuffers.Dimension getDimensionAsProtobuf(String key, String value){
        return SignalFxProtocolBuffers.Dimension.newBuilder()
                .setKey(key)
                .setValue(value)
                .build();
    }

    private void addMetric(
            String metricName, SignalFxProtocolBuffers.MetricType metricType,
            int metricValue, Map<String, String> dimensions, Session session) {
        SignalFxProtocolBuffers.DataPoint.Builder builder = 
            SignalFxProtocolBuffers.DataPoint.newBuilder()
                    .setMetric(metricName)
                    .setMetricType(metricType)
                    .setValue(
                            SignalFxProtocolBuffers.Datum.newBuilder()
                                    .setIntValue(metricValue));

        // Use AWS ARN as dimension uniquely identifying Lambda function
        dimensions.put("sf_source", functionArn);
        // TODO(jwy): Add dimensions for -
        // aws_region, aws_account_id, aws_lambda_function_name,
        // aws_lambda_function_version, aws_lambda_memory_limit,
        // aws_lambda_execution_env, event-source-mappings
        for (Map.Entry<String, String> entry: dimensions.entrySet()) {
            builder.addDimensions(getDimensionAsProtobuf(entry.getKey(), entry.getValue()));
        }
        session.setDatapoint(builder.build());
    }

    public void addGauge(String metricName, int metricValue, Map<String, String> dimensions,
                         Session session) {
        addMetric(metricName, SignalFxProtocolBuffers.MetricType.GAUGE, metricValue,
                  dimensions, session);
    }

    public void addCounter(String metricName, int metricValue, Map<String, String> dimensions,
                           Session session) {
        addMetric(metricName, SignalFxProtocolBuffers.MetricType.COUNTER, metricValue,
                  dimensions, session);
    }

    public void addCumulativeCounter(String metricName, int metricValue, Map<String, String> dimensions,
                                     Session session) {
        addMetric(metricName, SignalFxProtocolBuffers.MetricType.CUMULATIVE_COUNTER, metricValue,
                  dimensions, session);
    }
}

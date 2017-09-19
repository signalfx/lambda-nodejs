/*
 * Copyright (C) 2017 SignalFx, Inc.
 */
package com.signalfx.lambda;

import java.io.Closeable;
import java.io.IOException;
import java.util.Collections;

import com.amazonaws.services.lambda.runtime.Context;
import com.signalfx.endpoint.SignalFxEndpoint;
import com.signalfx.endpoint.SignalFxReceiverEndpoint;
import com.signalfx.metrics.auth.StaticAuthToken;
import com.signalfx.metrics.connection.HttpDataPointProtobufReceiverFactory;
import com.signalfx.metrics.connection.HttpEventProtobufReceiverFactory;
import com.signalfx.metrics.errorhandler.OnSendErrorHandler;
import com.signalfx.metrics.flush.AggregateMetricSender;
import com.signalfx.metrics.protobuf.SignalFxProtocolBuffers;

/**
 * @author park
 */
public class MetricWrapper implements Closeable {

    private static final String AUTH_TOKEN = "SIGNALFX_AUTH_TOKEN";
    private static final String TIMEOUT_MS = "SIGNALFX_SEND_TIMEOUT";

    private final AggregateMetricSender.Session session;

    public MetricWrapper(Context context) {
        String authToken = System.getenv(AUTH_TOKEN);
        int timeoutMs = -1;
        try {
            timeoutMs = Integer.valueOf(System.getenv(TIMEOUT_MS));
        } catch (NumberFormatException e) {
            // use default
        }

        String functionArn = context.getInvokedFunctionArn();

        // Create endpoint for ingest URL
        SignalFxReceiverEndpoint signalFxEndpoint = new SignalFxEndpoint();

        // Create datapoint receiver for endpoint
        HttpDataPointProtobufReceiverFactory receiver = new HttpDataPointProtobufReceiverFactory(signalFxEndpoint)
                .setVersion(2);

        if (timeoutMs > -1) {
            receiver.setTimeoutMs(timeoutMs);
        }

        AggregateMetricSender metricSender = new AggregateMetricSender(functionArn,
                receiver,
                new HttpEventProtobufReceiverFactory(signalFxEndpoint),
                new StaticAuthToken(authToken),
                Collections.<OnSendErrorHandler> singleton(metricError -> {
                }));
        session = metricSender.createSession();

        //TODO: prebuilt dimensions
    }

    protected void sendMetric(SignalFxProtocolBuffers.DataPoint.Builder builder) {
        session.setDatapoint(builder.build());
        //TODO: add all the dimensions that was prebuilt
    }

    @Override
    public void close() throws IOException {
        session.close();
    }
}

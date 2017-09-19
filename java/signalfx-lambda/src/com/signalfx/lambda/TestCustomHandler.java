/*
 * Copyright (C) 2017 SignalFx, Inc.
 */
package com.signalfx.lambda;

import java.util.Map;

import com.amazonaws.services.lambda.runtime.Context;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * @author park
 */
public class TestCustomHandler {

    public String handler(Map<String, String> input) {
        throw new RuntimeException("this is wrong");
    }

    public String handler(Map<String, String> input, Context context)
            throws JsonProcessingException {
        ObjectMapper objectMapper = new ObjectMapper();
        String str = objectMapper.writeValueAsString(input);
        System.out.println(str);
        return "here";
//        throw new RuntimeException("this is wrong");
    }
}

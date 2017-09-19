/*
 * Copyright (C) 2017 SignalFx, Inc.
 */
package com.signalfx.lambda;

import java.io.IOException;
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

/**
 * @author park
 */
public class SignalFxRequestWrapper implements RequestHandler<Object, Object> {

    private static final String SIGNALFX_LAMBDA_HANDLER = "SIGNALFX_LAMBDA_HANDLER";

    // TODO: fix all the exception to a proper one and not throw stacktrace for internal stuff.

    private Object targetObject;
    private Class<?> targetClass;
    private String targetMethodName;
    private Method targetMethod;

    public SignalFxRequestWrapper() {}

    private void instantiateTargetClass() {
        String functionSpec = System.getenv(SIGNALFX_LAMBDA_HANDLER);

        // expect format to be package.ClassName::methodName
        String[] splitted = functionSpec.split("::");
        if (splitted.length != 2) {
            throw new RuntimeException(functionSpec + " is not a valid handler");
        }
        String handlerClassName = splitted[0];
        targetMethodName = splitted[1];

        try {
            targetClass = Class.forName(handlerClassName);
            Constructor<?> ctor = targetClass.getConstructor();
            targetObject = ctor.newInstance();

        } catch (ClassNotFoundException e) {
            // no class found
            throw new RuntimeException(handlerClassName + " not found in classpath");
        } catch (NoSuchMethodException e) {
            // no constructor found
            throw new RuntimeException(handlerClassName + "  does not have appropriate constructor");
        } catch (InstantiationException e) {
            // it's a call to an abstract class
            throw new RuntimeException(handlerClassName + "  is an abstract class");
        } catch (IllegalAccessException e) {
            // non accessible access to instantiate
            throw new RuntimeException(handlerClassName + "'s  constructor is not accessible");
        } catch (InvocationTargetException e) {
            // constructor throws exception
            throw new RuntimeException(handlerClassName + " threw exception from constructor");
        }
    }

    private boolean isLastParameterContext(Parameter[] parameters) {
        if (parameters.length == 0) {
            return false;
        }
        return parameters[parameters.length -1].getType().equals(Context.class);
    }

    private Method getTargetMethod() {
        /*
            Per method selection specifications
            http://docs.aws.amazon.com/lambda/latest/dg/java-programming-model-handler-types.html
            - Context can be omitted
            - Select the method with the largest number of parameters.
            - If two or more methods have the same number of parameters, AWS Lambda selects the method that has the Context as the last parameter.
            - If none or all of these methods have the Context parameter, then the behavior is undefined.
         */
        List<Method> methods = Arrays.asList(targetClass.getMethods());
        Optional<Method> firstOptional = methods.stream()
                .filter((Method m) -> m.getName().equals(targetMethodName))
                .sorted((Method a, Method b) -> {
                    // sort descending (reverse of default ascending)
                    if (a.getParameterCount() != b.getParameterCount()) {
                        return b.getParameterCount() - a.getParameterCount();
                    }
                    if (isLastParameterContext(a.getParameters())) {
                        return -1;
                    } else if (isLastParameterContext(b.getParameters())) {
                        return 1;
                    }
                    return -1;
                }).findFirst();
        if (!firstOptional.isPresent()) {
            throw new RuntimeException("Method " + targetMethodName + " not found");
        }
        return firstOptional.get();
    }

    @Override
    public Object handleRequest(Object input, Context context) {
        try (MetricWrapper _ = new MetricWrapper(context)) {
            if (targetMethod == null) {
                instantiateTargetClass();
                targetMethod = getTargetMethod();
            }

            Class<?>[] parameterTypes = targetMethod.getParameterTypes();
            Object[] parameters = new Object[parameterTypes.length];
            for (int i = 0; i < parameterTypes.length; i++) {
                // loop through to populate each index of parameter

                Object parameter = null;
                Class clazz = parameterTypes[i];
                boolean isContext = clazz.equals(Context.class);
                if (i == 0 && !isContext) {
                    // first position if it's not context
                    parameter = input;
                } else if (isContext) {
                    // populate context
                    parameter = context;
                }
                parameters[i] = parameter;
            }

            Object returnObj;
            try {
                returnObj = targetMethod.invoke(targetObject, parameters);
            } catch (IllegalAccessException e) {
                // Method can have access that prohibited calling
                throw new RuntimeException("Method is inaccessible", e);
            } catch (InvocationTargetException e) {
                // Underlying method throw exception
                throw new RuntimeException(e.getTargetException());
            } catch (Exception e) {
                // something else
                throw new RuntimeException("something went wrong", e);
            }

            return returnObj;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    /**
     * Example event for java lambda runner.
     */
    public String getExampleEvent() {
        return "{\"abc\":\"def\"}";
    }
}

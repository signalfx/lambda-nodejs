# SignalFx Node.js Lambda Wrapper

## Overview 

You can use this document to add a SignalFx wrapper to your AWS Lambda for Node.js. 

The SignalFx Node.js Lambda Wrapper wraps around an AWS Lambda Node.js function handler, which allows metrics to be sent to SignalFx.

At a high-level, to add a SignalFx Node.js Lambda wrapper, you can:
   * Package the code yourself; or
   * Use a Lambda layer containing the wrapper, and then attach the layer to a Lambda function.

To learn more about Lambda Layers, please visit the [AWS documentation site](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html).

## Step 1: Add the Lambda wrapper in AWS

To add the SignalFx wrapper, you have the following options:
   
   * Option 1: In AWS, create a Lambda function, then attach a SignalFx-hosted layer with a wrapper.
      * If you are already using Lambda layers, then SignalFx recommends that you follow this option. 
      * In this option, you will use a Lambda layer created and hosted by SignalFx.
   * Option 2: In AWS, create a Lambda function, then create and attach a layer based on a SignalFx SAM (Serverless Application Model) template.
      * If you are already using Lambda layers, then SignalFx also recommends that you follow this option. 
      * In this option, you will choose a SignalFx template, and then deploy a copy of the layer.
   * Option 3: Use the wrapper as a regular dependency, and then create a Lambda function based on your artifact containing both code and dependencies.
   
For advanced users who want to reduce the size of deployment packages, you can use the wrapper as a developer dependency, but in production, you would add the wrapper to layer in the Lambda environment. This option allows you to work with the wrapper in a local setting and reduce the size of deployment packages at the same time. Please note that this option is not fully documented. 

### Option 1: Create a Lambda function, then attach the SignalFx-hosted Lambda layer

In this option, you will use a Lambda layer created and hosted by SignalFx.

1. To verify compatibility, review the list of supported regions. See [Lambda Layer Versions](https://github.com/signalfx/lambda-layer-versions/blob/master/node/NODE.md).
2. Open your AWS console. 
3. In the landing page, under **Compute**, click **Lambda**.
4. Click **Create function** to create a layer with SignalFx's capabilities.
5. Click **Author from scratch**.
6. In **Function name**, enter a descriptive name for the wrapper. 
7. In **Runtime**, select the desired language.
8. Click **Create function**. 
9. Click **Layers**, then add a layer.
10. Mark **Provide a layer version**.
11. Enter an ARN number. 
  * To locate the ARN number, see [Lambda Layer Versions](https://github.com/signalfx/lambda-layer-versions/blob/master/node/NODE.md).

### Option 2: Create a Lambda function, then create and attach a layer based on a SignalFx template

In this option, you will choose a SignalFx template, and then deploy a copy of the layer.

1. Open your AWS console. 
2. In the landing page, under **Compute**, click **Lambda**.
3. Click **Create function** to create a layer with SignalFx's capabilities.
4. Click **Browse serverless app repository**.
5. Click **Public applications**.
6. In the search field, enter and select **signalfx-lambda-python-wrapper**.
7. Review the template, permissions, licenses, and then click **Deploy**.
    * A copy of the layer will now be deployed into your account.
8. Return to the previous screen to add a layer to the function, select from list of runtime compatible layers, and then select the name of the copy. 

### Option 3: Install the wrapper package with npm

Run the following installation script in your command line to install latest version of the wrapper:

```javascript
npm install signalfx-lambda
```    
Make sure the package is saved to your package.json. (Newer versions of npm perform this function automatically.)

## Step 2: Locate the ingest endpoint

By default, this function wrapper will send data to the us0 realm. As a result, if you are not in the us0 realm and you want to use the ingest endpoint directly, then you must explicitly set your realm. 

To locate your realm:

1. Open SignalFx and in the top, right corner, click your profile icon.
2. Click **My Profile**.
3. Next to **Organizations**, review the listed realm.

To set your realm, use a subdomain, such as ingest.us1.signalfx.com or ingest.eu0.signalfx.com. You will use the realm subdomain to set SIGNALFX_INGEST_ENDPOINT variable in the next step.

## Step 3: Set environment variables

1. Set SIGNALFX_AUTH_TOKEN with your correct access token. Review the following example. 
    ```bash
     SIGNALFX_AUTH_TOKEN=signalfx token
    ```
2. Set the ingest endpoint URL with the domain that corresponds to your realm. Review the following example.   
    ```bash
    SIGNALFX_INGEST_ENDPOINT=[https://pops.signalfx.com]
    ```
3. (Optional) Update SIGNALFX_SEND_TIMEOUT. Review the following example. 
    ```bash
    SIGNALFX_SEND_TIMEOUT=milliseconds for signalfx client timeout [1000]
    ```

## Step 4: Wrap a function
      
1. Wrap your function handler. Review the following example.  
   ```js
   'use strict';
   
   const signalFxLambda = require('signalfx-lambda');
   
   exports.handler = signalFxLambda.wrapper((event, context, callback) => {
   ...
   });
   ```

2. Use async/await. Review the following example.  
    ```js
   'use strict';
   
   const signalFxLambda = require('signalfx-lambda');
   
   exports.handler = signalFxLambda.asyncWrapper(async (event, context) => {
   ...
   });
   ```

## (Optional) Step 5: Send custom metrics from a Lambda function

1. If you use synchronous wrapper, review the following example. 

    ```js
    'use strict';
    
    const signalFxLambda = require('signalfx-lambda');
    
    exports.handler = signalFxLambda.wrapper((event, context, callback) => {
      ...
      signalFxLambda.helper.sendGauge('gauge.name', value);
      callback(null, 'Done');
    });
    ```

2. If you use `async/await`, review the following example. 
    ```js
    'use strict';
    
    const signalFxLambda = require('signalfx-lambda');
    
    exports.handler = signalFxLambda.asyncWrapper(async (event, context) => {
      ...
      signalFxLambda.helper.sendGauge('gauge.name', value);
    });
    ```
    
## (Optional) Step 6: Send custom events or CloudWatch events from a Lambda function

1. If you use synchronous wrapper, review the following example. 

    ```js
    'use strict';
    
    const signalFxLambda = require('signalfx-lambda');
    
    exports.handler = signalFxLambda.wrapper((event, context, callback) => {
      ...
      // to send custom event:
      signalFxLambda.helper.sendCustomEvent('Custom', {functionName: context.functionName}, {description: 'Custom event'})
         .then(() => callback(null, 'Done'));
      
      // to transform & forward CloudWatch event:
      signalFxLambda.helper.sendCloudWatchEvent(event)
         .then(() => callback(null, 'Done'))
      
    });
    ```

2. If you use `async/await`, review the following example. 
    ```js
    'use strict';
    
    const signalFxLambda = require('signalfx-lambda');
    
    exports.handler = signalFxLambda.asyncWrapper(async (event, context) => {
      ...
      // to send custom event:
      await signalFxLambda.helper.sendCustomEvent('Custom', {functionName: context.functionName}, {description: 'Custom event'});
            
      // to transform & forward CloudWatch event:
      await signalFxLambda.helper.sendCloudWatchEvent(event);
      ...
    });
    ```
For additional examples see [sample functions forwarding events to SignalFx](https://github.com/signalfx/cloudwatch-event-forwarder/blob/master/examples).

## Additional information and optional steps

### Metrics and dimensions sent by the wrapper

The Lambda wrapper sends the following metrics to SignalFx:

| Metric Name  | Type | Description |
| ------------- | ------------- | ---|
| function.invocations  | Counter  | Count number of Lambda invocations|
| function.cold_starts  | Counter  | Count number of cold starts|
| function.errors  | Counter  | Count number of errors from underlying Lambda handler|
| function.duration  | Gauge  | Milliseconds in execution time of underlying Lambda handler|

The Lambda wrapper adds the following dimensions to all data points sent to SignalFx:

| Dimension | Description |
| ------------- | ---|
| lambda_arn  | ARN of the Lambda function instance |
| aws_region  | AWS Region  |
| aws_account_id | AWS Account ID  |
| aws_function_name  | AWS Function Name |
| aws_function_version  | AWS Function Version |
| aws_function_qualifier  | AWS Function Version Qualifier (version or version alias if it is not an event source mapping Lambda invocation) |
| event_source_mappings  | AWS Function Name (if it is an event source mapping Lambda invocation) |
| aws_execution_env  | AWS execution environment (e.g. AWS_Lambda_nodejs10.x) |
| function_wrapper_version  | SignalFx function wrapper qualifier (e.g. signalfx-lambda-0.0.9) |
| metric_source | The literal value of 'lambda_wrapper' |


### Deployment

1. Run `npm pack` to package the module with the configuration in `package.json`.

### Test

1. Install node-lambda via `npm install -g node-lambda` (globally) or `npm install node-lambda` (locally).

#### Test locally

1. Create deploy.env to submit data to SignalFx, which will include the required and optional environment variables mentioned above.

2. Run `node-lambda run -f deploy.env`.

#### Test from AWS

1. Run `node-lambda deploy -f deploy.env` to deploy to AWS, which will use any environment variables configured in `.env`. For example: 

```
AWS_ENVIRONMENT=
AWS_PROFILE=
AWS_SESSION_TOKEN=
AWS_HANDLER=index.handler
AWS_MEMORY_SIZE=128
AWS_TIMEOUT=3
AWS_DESCRIPTION=
AWS_RUNTIME=nodejs10.x
AWS_VPC_SUBNETS=
AWS_VPC_SECURITY_GROUPS=
AWS_TRACING_CONFIG=
AWS_REGION=us-east-2
AWS_FUNCTION_NAME=my-function
AWS_ROLE_ARN=arn:aws:iam::someAccountId:role/someRole
PACKAGE_DIRECTORY=build
```

### License

Apache Software License v2. Copyright © 2014-2020 Splunk, Inc.

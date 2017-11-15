# SignalFx Node Lambda Wrapper

SignalFx Node Lambda Wrapper.

## Usage

The SignalFx NodeJS Lambda Wrapper is a wrapper around an AWS Lambda NodeJS function handler, used to instrument execution of the function and send metrics to SignalFx.

### Installation

Use the hosted package:
```
{
  "name": "my-module",
  "dependencies": {
    "signalfx-lambda": "^0.0.11"
  }
}
```

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
| aws_execution_env  | AWS execution environment (e.g. AWS_Lambda_nodejs6.10) |
| function_wrapper_version  | SignalFx function wrapper qualifier (e.g. signalfx-lambda-0.0.9) |
| metric_source | The literal value of 'lambda_wrapper' |

### Sending a metric from the Lambda function

```
'use strict';

const signalFxLambda = require('signalfx-lambda');

exports.handler = signalFxLambda.wrapper((event, context, callback) => {
  ...
  signalFxLambda.helper.sendGauge('gauge.name', value);
  callback(null, 'Done');
});
```

### Deployment

Run `npm pack` to package the module with the configuration in `package.json`.

## Testing

Install node-lambda via `npm install -g node-lambda` (globally) or `npm install node-lambda` (locally).

### Testing locally

Create deploy.env to submit data to SignalFx, containing the following environment variables:

1) Set authentication token:
```
 SIGNALFX_AUTH_TOKEN=signalfx token
```

2) Optional parameters available:
```
SIGNALFX_SEND_TIMEOUT=milliseconds for signalfx client timeout [1000]

# Change the ingest endpoint URL:
SIGNALFX_INGEST_ENDPOINT=[https://ingest.signalfx.com:443]
```

3) Run `node-lambda run -f deploy.env`.

## Testing from AWS

Run `node-lambda deploy -f deploy.env` to deploy to AWS. It will use any environment variables configured in `.env`. Example:

```
AWS_ENVIRONMENT=
AWS_PROFILE=
AWS_SESSION_TOKEN=
AWS_HANDLER=index.handler
AWS_MEMORY_SIZE=128
AWS_TIMEOUT=3
AWS_DESCRIPTION=
AWS_RUNTIME=nodejs6.10
AWS_VPC_SUBNETS=
AWS_VPC_SECURITY_GROUPS=
AWS_TRACING_CONFIG=
AWS_REGION=us-east-2
AWS_FUNCTION_NAME=my-function
AWS_ROLE_ARN=arn:aws:iam::someAccountId:role/someRole
PACKAGE_DIRECTORY=build
```

### License

Apache Software License v2. Copyright © 2014-2017 SignalFx

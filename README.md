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
    "signalfx-lambda": "https://cdn.signalfx.com/signalfx-lambda-0.0.9.tgz"
  }
}
```

Alternatively, download the hosted package and use it locally by a relative reference in your module's `package.json`:
```
{
  "name": "my-module",
  "dependencies": {
    "signalfx-lambda": "file:../signalfx-lambda-0.0.9.tgz"
  }
}
```

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

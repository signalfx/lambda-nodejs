# SignalFx Node Lambda Wrapper

SignalFx Node Lambda Wrapper.

## Testing
Use `node-lambda` to test the wrapper locally.
1) Install node-lambda via `npm install node-lambda` and the signalfx client library via `npm install signalfx`.
2) Create deploy.env and add the following environment variables that are required, to submit data to SignalFx:
```
 SIGNALFX_AUTH_TOKEN=[token] - required
 SIGNALFX_SEND_TIMEOUT=[millescondsToWaitForRequest]
 # Set only all of the following or none, to use the defaults, for the ingest endpoint URL:
 SIGNALFX_API_HOSTNAME=ingest.signalfx.com
 SIGNALFX_API_PORT=443
 SIGNALFX_API_SCHEME=https
```
3) Run `node-lambda run -f deploy.env` and see the result.

## Uploading the test package
Run `node-lambda deploy -f deploy.env` to deploy to AWS, using the environmental variables for the Lambda function configured in `.env`.

## Deploy
Run `npm pack` to package the module with the configuration in `package.json`.

## Usage of deployed package
The module can be used locally by a relative reference in `package.json`:
```
{
  "name": "signalfx-test",
  "dependencies": {
    "signalfx-lambda": "file:../signalfx-lambda-0.0.4.tgz"
  }
}
```

Alternatively, the module can be used from the hosted package:
```
{
  "name": "signalfx-test",
  "dependencies": {
    "signalfx-lambda": "https://cdn.signalfx.com/signalfx-lambda-0.0.4.tgz"
  }
}
```


# SignalFx Node Lambda Wrapper

SignalFx Node Lambda Wrapper.

## Testing
Use `node-lambda` to test the wrapper locally.
1) Install node-lambda via npm install node-lambda
2) Create deploy.env and add the following environment variables which is required to submit data to signalfx
`
 SIGNALFX_API_HOSTNAME=ingest.signalfx.com
 SIGNALFX_API_PORT=443
 SIGNALFX_API_SCHEME=https
 SIGNALFX_AUTH_TOKEN=[token]
 `

3) Run `node-lambda run -f deploy.env` and see the result.

## Uploading the test package
`node-lambda deploy -f deploy.env` and it will deploy to AWS using your environmental variable to lambda function configured in `.env`

## Deploy
run `npm pack` to package the module with configurations in `package.json`

## Usage of deployed package
The module can be used locally by relative reference in `package.json` as
` {
	"name": "signalfx-test",
  "dependencies": {
      "signalfx-lambda": "file:../signalfx-lambda-0.0.3.tgz"
  }
}`

The module can be used from hosted package as
` {
	"name": "signalfx-test",
  "dependencies": {
      "signalfx-lambda": "https://cdn.signalfx.com/signalfx-lambda-0.0.3.tgz"
  }
}`


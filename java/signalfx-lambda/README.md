# SignalFx Java Lambda Wrapper

SignalFx Java Lambda Wrapper.

## Testing from the AWS Console
1) Put pom.xml in the top level directory. Change groupId, artifactId, and name
as appropriate.
2) Put SignalFxLambdaMetricSender.java and LambdaOnSendErrorHandler.java with
the other source files. E.g., under src/main/java/example/.
3) Run `mvn package` in the top level directory.
4) In the AWS Console, author a Lambda function from scratch.
5) Fill in required fields. Change "Code entry type" to "Upload a .ZIP file"
and upload target/<mvn-package-name>-1.0-SNAPSHOT.jar.
6) Set the following environment variables:
```
 SIGNALFX_API_HOSTNAME=ingest.signalfx.com
 SIGNALFX_API_PORT=443
 SIGNALFX_API_SCHEME=https
 SIGNALFX_AUTH_TOKEN=[token]
 TIMEOUT_MS=[millescondsToWaitForRequests] - optional
```

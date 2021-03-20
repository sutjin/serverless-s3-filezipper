# S3 Zipped file streamer

This application will stream through s3 folder and create a new zipped folder. WIll use AWS Lambda and AWS Layer to stream through files to create the zip folder.

## Requirements

* [NodeJs](https://nodejs.org/en/download/)
* [Serverless](https://www.serverless.com/)

## Installation

Download Serverless [here](https://www.serverless.com/framework/docs/getting-started/)
or use NPM with
```
npm install -g serverless
```

Make sure `aws-cli` is [installed and configured](https://aws.amazon.com/cli/). You will need to have access to your AWS Keys

Install project dependency with

```
npm install
```

## Deployment
Deploy the app to your AWS account with
```
serverless deploy
```
This will automatically create a lambda function called `s3-filestreamer` along with all the dependency needed.
## Executing in AWS
You can run the project from the lambda function dashboard or via the `aws-cli`, but it will require this object to be passed:
```
{
  Bucket: '<name_of_bucket>',
  prefix: '<folder_path>',
  zippedFileKey: <name_of_zipped_folder>
}
```

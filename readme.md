# S3 Zipped file streamer

This application will stream through s3 folder and create a new zipped folder. WIll use AWS Lambda and AWS Layer to stream through files to create the zip folder. Uses serverless to manage application state

## Requirements

* [NodeJs](https://nodejs.org/en/download/)

## Installation

Make sure `aws-cli` is [installed and configured](https://aws.amazon.com/cli/). You will need to have access to your AWS Keys

Install project dependency with

```
npm install
```

## Deployment
Deploy the app to your AWS account with
```
npx sls deploy
```
This will automatically create a lambda function called `s3-filestreamer` along with all the dependency needed.
## Executing in AWS
You can run the project from the lambda function dashboard or via the `aws-cli`, but it will require this object to be passed:
```
{
  Bucket: '<name_of_bucket>',
  uploadBucket: '<name_of_bucket>', (optional, use if destination bucket is different)
  prefix: '<folder_path>',
  chunks: 0, (optional, defaults up to 200 files per zip)
  set: 0, (optional, if empty will try to loop chunks for upload)
  zippedFileKey: <name_of_zipped_folder>
}
```

### Developer Note

AWS seems to have a stream limit of about 200~ files before it exits, so if you are trying to zip massive amounts of files, would need to use the `set` field to get the specific `chunks` to zip.

`chunk` is defined as the collection of files. If we have 100 files chunked at 10 files, means we will have 10 groups. `set = 0` means we will use group 1 of 10. This means you will have to retrigger the function by adding the set value everytime.

## Triggering locally
Two terminal will be needed in order to run this lambda locally

1. for strarting serverless offiline
```
npx sls offline
```
2. for triggering the lambda
```
aws lambda invoke --endpoint-url http://localhost:3002 --function-name s3-filestreamer-dev-Zip  --cli-binary-format raw-in-base64-out --payload file://payload.json response.json
```
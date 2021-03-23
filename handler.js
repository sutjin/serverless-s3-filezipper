import * as Archiver from 'archiver';
import * as AWS from 'aws-sdk';
import { Stream } from 'stream';

const S3 = new AWS.S3();

export const execute = async (event) => {
  validateEvent(event);

  const params = {
    Bucket: event.Bucket, /* required */
    Prefix: event.prefix  // Can be your folder name
  };

  const objectList = await asyncGetAllKeys(params);

  const s3FileDwnldStreams = objectList.map(item => {
    const stream = S3.getObject({ Key: item, Bucket: event.Bucket }).createReadStream();
    return {
      stream,
      fileName: item,
    };
  });

  const streamPassThrough = new Stream.PassThrough();

  const uploadParams = {
    ACL: "private",
    Bucket: event.Bucket,
    Body: streamPassThrough,
    ContentType: "application/zip",
    Key: event.zippedFileKey,
  };

  const s3Upload = S3.upload(uploadParams, (err, data) => {
    if (err) console.error("upload error", err);
    else console.log("upload done", data);
  });
  const archive = Archiver("zip", {
    zlib: { level: 0 },
  });
  archive.on("error", error => {
    throw new Error(
      `${error.name} ${error.code} ${error.message} ${error.path}  ${error.stack}`
    );
  });

  s3Upload.on("httpUploadProgress", progress => {
    console.log(progress);
  });

  await new Promise((resolve, reject) => {
    s3Upload.on("close", resolve());
    s3Upload.on("end", resolve());
    s3Upload.on("error", reject());

    archive.pipe(streamPassThrough);
    s3FileDwnldStreams.forEach(s3FileDwnldStream => {
      archive.append(s3FileDwnldStream.stream, {
        name: s3FileDwnldStream.fileName,
      });
    });
    archive.finalize();
  }).catch(error => {
    console.error("ArchiveError");
    throw new Error(`${error.code} ${error.message} ${error.data}`);
  });

  await s3Upload.promise();
};

function validateEvent(event) {
  if (!event.Bucket || !event.prefix || !event.zippedFileKey) {
    throw `Bucket, prefix or zippedFileKey value is undefined`;
  };
};

async function asyncGetAllKeys(params) {
  return new Promise((resolve, reject) => {
    const allKeys = [];
    listAllKeys(allKeys, params, resolve, reject);
  });
};

function listAllKeys(allKeys, params, resolve, reject) {
  S3.listObjectsV2(params, function (err, data) {
      if (err) {
          console.error("ListAllKeyError");
          console.log(err, err.stack); // an error occurred
          reject(err);
      } else {
          var contents = data.Contents;
          contents.forEach(function (content) {
              allKeys.push(content.Key);
          });

          if (data.IsTruncated) {
              params.ContinuationToken = data.NextContinuationToken;
              console.log("get further list...");
              listAllKeys(allKeys, params, resolve, reject);
          } else {
            resolve(allKeys);
          };
      };
  });
};

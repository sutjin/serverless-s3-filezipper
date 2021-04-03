import * as Archiver from 'archiver';
import * as AWS from 'aws-sdk';
import { Stream } from 'stream';

// eslint-disable-next-line no-extend-native
Object.defineProperty(Array.prototype, 'chunk', {
  value: function(chunkSize) {
    var R = [];
    for (var i = 0; i < this.length; i += chunkSize)
      R.push(this.slice(i, i + chunkSize));
    return R;
  },
  configurable: true
});

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

  const s3FileDwnldStreams_chunks = s3FileDwnldStreams.chunk(event.chunk || 200);

  console.log(`chunked for ${s3FileDwnldStreams_chunks.length}`);

  if (typeof event.set !== 'undefined') {
    if (event.set > s3FileDwnldStreams_chunks.length) {
      throw new Error(`set must be between 0 and ${s3FileDwnldStreams_chunks.length - 1}`);
    }
    console.log(`manually processing chunk: ${event.set + 1} of ${s3FileDwnldStreams_chunks.length}`);
    return streamFile(event, s3FileDwnldStreams_chunks[event.set], event.set);
  } else {
    // Async foreach
    return asyncForEach(event, s3FileDwnldStreams_chunks, streamFile);
  }
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

async function streamFile (event, chunk, index) {
  const streamPassThrough = new Stream.PassThrough();

  const uploadParams = {
    ACL: "private",
    Bucket: event.uploadBucket || event.Bucket,
    Body: streamPassThrough,
    ContentType: "application/zip",
    Key: `${event.prefix}/${index}_${event.zippedFileKey}`,
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

  // s3Upload.on("httpUploadProgress", progress => {
  //   console.log(progress);
  // });

  await new Promise((resolve, reject) => {
    streamPassThrough.on("close", resolve);
    streamPassThrough.on("end", resolve);
    streamPassThrough.on("error", reject);

    archive.pipe(streamPassThrough);
    chunk.forEach(s3FileDwnldStream => {
      archive.append(s3FileDwnldStream.stream, {
        name: s3FileDwnldStream.fileName,
      });
    });
    archive.finalize();
  }).catch(error => {
    console.error("ArchiveError");
    throw new Error(`${error.code} ${error.message} ${error.data}`);
  });

  return await s3Upload.promise();
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
            console.log('S3 Keys Generated');
            resolve(allKeys);
          };
      };
  });
};

function asyncForEach(event, array, callback) {
  return new Promise(async (resolve, _) => {
    for (let index = 0; index < array.length; index++) {
      try {
        console.log(`processing chunk: ${index + 1} of ${array.length}`);
        await callback(event, array[index], index, array);
      } catch (err) {
        console.log(`Err in chunk: ${index}`);
        console.log(err);
      }
    };

    resolve(null);
  });
};

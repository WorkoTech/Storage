import * as fs from 'fs';
import * as minio from 'minio';


const bucketExist = (minioClient: minio.Client, bucket: string) => {
    return new Promise((resolve, reject) => {
        minioClient.bucketExists(bucket, (err, exist) => {
               if (err) {
                   reject(err);
               }
               resolve(exist);
        })
    })
}

const makeBucket = (minioClient: minio.Client, bucket: string) => {
    return new Promise((resolve, reject) => {
        minioClient.makeBucket(bucket, 'eu-fr-1',(err) => {
            if (err)
                reject(err);
            resolve();
        });
    });
}

export const uploadFileToMinio = (minioClient: minio.Client, bucket: string, objectName: string, file) => {
    return bucketExist(minioClient, bucket)
        .then(
            exist => {
                if (!exist) {
                    return makeBucket(minioClient, bucket);
                }
            }
        ).then(
            () => {
                return minioClient.putObject(bucket, objectName, file.data, file.size, (err, etag) => {
                    if (err) {
                        throw err;
                    }
                });
            }
        )
}

export const deleteMinioFile = (minioClient: minio.Client, bucket: string, objectName: string) => {
    return new Promise((resolve, reject) => {
        minioClient.removeObject(
            bucket,
            objectName,
            (err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            }
        )
    })
}

export const getMinioFile = (minioClient: minio.Client, bucket: string, objectName: string) => {
    let buffers = [];

    return new Promise((resolve, reject) => {
        minioClient.getObject(bucket, objectName, function(err, dataStream) {
            if (err) {
                console.log(err)
                reject(err);
            }

            dataStream.on('data', function(chunk) {
                buffers.push(chunk);
            })
            dataStream.on('end', function() {
                resolve(Buffer.concat(buffers));
            })

            dataStream.on('error', function(err) {
                console.log(err)
                reject(err);
            })
        })
    });
}

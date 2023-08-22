import { success, failure } from "../utils.js";

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import settings from "../../config/settings.js";

const region = "us-west-2";
const bucket = settings.awsBucket;
const credentials = {
  accessKeyId: settings.awsAccessKeyId,
  secretAccessKey: settings.awsSecretAccessKey,
};
const s3 = new S3Client({ region, credentials });

export const getFromS3 = async (s3key) => {
  const params = {
    Bucket: settings.awsBucket,
    Key: s3key,
  };
  try {
    const data = await s3.send(new GetObjectCommand(params));

    const res = await streamToString(data.Body);
    return success(res);
  } catch (error) {
    console.log("error getting from s3", params);
    console.log(error);
    return failure(error);
  }
};

export const uploadToS3 = async (s3key, data) => {
  const params = {
    Bucket: settings.awsBucket,
    Key: s3key,
    Body: data,
  };

  try {
    const data = await s3.send(new PutObjectCommand(params));
    return success();
  } catch (error) {
    console.log("error putting to s3", params);
    console.log(error);
    return failure(error);
  }
};

export async function streamToString(stream) {
  return await new Promise((resolve, reject) => {
    try {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    } catch (error) {
      console.log({ error });
      return Promise.reject("streamToString failed");
    }
  });
}

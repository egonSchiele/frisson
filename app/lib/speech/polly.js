import { WriteStream } from "fs";

import { nanoid } from "nanoid";
import settings from "../../config/settings.js";
import {
  PollyClient,
  SynthesizeSpeechCommand,
  StartSpeechSynthesisTaskCommand,
  GetSpeechSynthesisTaskCommand,
} from "@aws-sdk/client-polly";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { success, failure } from "../utils.js";

const region = "us-west-2";
const bucket = settings.awsBucket;
const credentials = {
  accessKeyId: settings.awsAccessKeyId,
  secretAccessKey: settings.awsSecretAccessKey,
};
const polly = new PollyClient({
  region,
  credentials,
});

export async function textToSpeech(_text, outputFileName, res) {
  const text = _text.substring(0, 3000);
  const command = new SynthesizeSpeechCommand({
    OutputFormat: "mp3",
    Text: text,
    VoiceId: "Joanna",
  });

  try {
    const response = await polly.send(command);
    const audioStream = response.AudioStream;
    const outputStream = new WriteStream(outputFileName);
    audioStream.pipe(outputStream);

    return new Promise(function (resolve, reject) {
      outputStream.on("finish", () => {
        console.log(`Speech saved to: ${outputFileName}`);
        resolve(outputFileName);
      });
      outputStream.on("error", (err) => {
        console.error(`Failed saving speech to: ${outputFileName}`);
        reject(err);
      });
    });
  } catch (err) {
    console.error("Error occurred while converting text to speech:", err);
  }
}

export async function textToSpeechLong(text, outputFileName, res) {
  const text_type = "text";
  // title.gsub(" ", "_")
  const key = nanoid();

  var params = {
    OutputFormat: "mp3",
    OutputS3BucketName: bucket,
    Text: text,
    TextType: text_type,
    VoiceId: "Joanna",
  };

  let resp = null;
  try {
    resp = await polly.send(new StartSpeechSynthesisTaskCommand(params));
    console.log("Success, audio task started in " + params.OutputS3BucketName);
  } catch (err) {
    console.log("Error putting object", err);
  }

  const task_id = resp.SynthesisTask.TaskId;
  console.log("task_id is " + task_id);
  return success(task_id);
}

export async function getTaskStatus(task_id) {
  const task = await polly.send(
    new GetSpeechSynthesisTaskCommand({ TaskId: task_id })
  );
  const task_status = task.SynthesisTask.TaskStatus;
  if (task_status == "completed") {
    console.log("synthesized.");
    const uri = task.SynthesisTask.OutputUri;
    const parts = uri.split("/");
    const s3key = parts[parts.length - 1];
    console.log("s3key is " + s3key);
    return success({ s3key });
    //console.log("downloading from s3...");

    //done = true;
  } else if (task_status == "failed") {
    console.log(`converting ${title} failed:`);
    return failure(task.SynthesisTask.TaskStatusReason);
  }
  return failure({ status: task_status });
}

import { Request, Response } from "express";
import { getUserId } from "../../../../../../lib/authentication/firebase.js";
import { getTaskStatus } from "../../../../../../lib/speech/polly.js";
import { saveSpeech } from "../../../../../../lib/storage/firebase.js";
import { getFromS3 } from "../../../../../../lib/storage/s3.js";
import { requireLogin } from "../../../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  try {
    const { chapterid, task_id } = req.params;
    const userid = getUserId(req);
    const status = await getTaskStatus(task_id);
    if (status.success === true) {
      const s3key = status.data.s3key;
      const data = await getFromS3(s3key);
      if (data.success === true) {
        const created_at = Date.now();
        await saveSpeech(chapterid, { s3key, userid, created_at });

        // return audio
        res.writeHead(200, {
          "Content-Type": "audio/mpeg",
          "Content-disposition": "inline;filename=chiselaudio.mp3",
          "Content-Length": data.data.length,
        });
        res.end(data.data);
      } else {
        res.status(400).send(data.message).end();
      }
    } else {
      res.status(200).json(status.message).end();
    }
  } catch (e) {
    console.log(e);
    res.status(400).send(e.message).end();
  }
};

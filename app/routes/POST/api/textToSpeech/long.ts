import { Request, Response } from "express";
import { getUser, saveUser } from "../../../../lib/authentication/firebase.js";
import {
  hasPermission,
  updatePermissionLimit,
} from "../../../../lib/serverUtils.js";
import { textToSpeechLong } from "../../../../lib/speech/polly.js";
import { requireLogin } from "../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const user = await getUser(req);
  const { chapterid, text } = req.body;
  const truncatedText = text.substring(0, 100_000);
  const filename = "test.mp3";
  if (!user) {
    console.log("no user");
    res.status(404).end();
  } else {
    const permissionCheck = hasPermission(
      user,
      "amazon_polly",
      truncatedText.length
    );
    if (permissionCheck.success === true) {
      const updateLimit = await updatePermissionLimit(
        user,
        saveUser,
        "amazon_polly",
        truncatedText.length
      );
      if (!updateLimit.success === true) {
        res.status(400).send(updateLimit.message).end();
        return;
      }

      const task_id = await textToSpeechLong(truncatedText, filename, res);
      res.json({ success: true, task_id });
    } else {
      console.log("no polly permission");
      res.status(400).send(permissionCheck.message).end();
    }
  }
};

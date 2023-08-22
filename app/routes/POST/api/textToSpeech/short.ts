import { Request, Response } from "express";
import fs from "fs";
import { getUser, saveUser } from "../../../../lib/authentication/firebase.js";
import {
  hasPermission,
  updatePermissionLimit,
} from "../../../../lib/serverUtils.js";
import { textToSpeech } from "../../../../lib/speech/polly.js";
import { requireLogin } from "../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const user = await getUser(req);
  const { text } = req.body;
  const truncatedText = text.substring(0, 3000);

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
      const filename = "test.mp3";
      await textToSpeech(truncatedText, filename, res);
      console.log("piping");
      const data = fs.readFileSync(filename);
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-disposition": "inline;filename=" + filename,
        "Content-Length": data.length,
      });
      res.end(data);
    } else {
      console.log("no polly permission");
      res.status(400).send(permissionCheck.message).end();
    }
  }
};

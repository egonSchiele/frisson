import formidable from "formidable";
import { Request, Response } from "express";
import { nanoid } from "nanoid";
import path from "path";
import settings from "../../../../config/settings.js";
import { getUser, saveUser } from "../../../../lib/authentication/firebase.js";
import {
  hasPermission,
  updatePermissionLimit,
} from "../../../../lib/serverUtils.js";
import { run, getAudioDuration } from "../../../../lib/utils.js";
import { requireLogin } from "../../../../lib/utils/middleware/requireLogin.js";
import fs from "fs";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const user = await getUser(req);
  if (!user) {
    console.log("no user");
    return res.status(404).end();
  }

  const form = formidable({ multiples: true });
  form.parse(req, async (err, fields, files) => {
    console.log({ err, fields, files });
    if (err) {
      res.writeHead(err.httpCode || 400, { "Content-Type": "text/plain" });
      res.end(String(err));
      return;
    }

    const c = req.cookies;
    if (c.csrfToken !== fields.csrfToken) {
      console.log("csrf token mismatch");
      res
        .status(400)
        .send(
          "Could not butter your uploaded parsnips. Try refreshing your browser."
        )
        .end();
      return;
    }

    const oldPath = files.audioFile.filepath;
    const ext = path.extname(files.audioFile.originalFilename);
    const newPath = "uploads/" + nanoid() + ext;
    console.log({ newPath, oldPath });
    const rawData = fs.readFileSync(oldPath);

    await run("mkdir -p uploads");
    // @ts-ignore
    await writeFileAwait(newPath, rawData, function (err) {
      if (err) console.log(err);
    });

    const duration = await getAudioDuration(newPath);

    const permissionCheck = hasPermission(user, "openai_api_whisper", duration);
    if (!permissionCheck.success === true) {
      console.log("no whisper permission");
      return res.status(400).send(permissionCheck.message).end();
    }

    const updateLimit = await updatePermissionLimit(
      user,
      saveUser,
      "openai_api_whisper",
      duration
    );
    if (!updateLimit.success === true) {
      res.status(400).send(updateLimit.message).end();
      return;
    }

    let mp3Path = newPath.replaceAll(".wav", ".mp3");
    mp3Path = mp3Path.replaceAll(".m4a", ".mp3");

    if (newPath !== mp3Path) {
      const convert = await run(`ffmpeg -y -i ${newPath} ${mp3Path}`);
      console.log({ convert });
    }
    const response = await run(`
    curl --request POST \
  --url https://api.openai.com/v1/audio/transcriptions \
  --header 'Authorization: Bearer ${settings.openAiApiKey}' \
  --header 'Content-Type: multipart/form-data' \
  --form file=@${mp3Path} \
  --form model=whisper-1`);
    await run(`rm ${mp3Path}`);
    if (newPath !== mp3Path) {
      await run(`rm ${newPath}`);
    }
    console.log({ response });
    const json = JSON.parse(response);
    if (json.error) {
      console.log(json.error);
      res.status(400).send(json.error.message).end();
      return;
    }
    res.json(json).end();
  });
};

import { Request, Response } from "express";
import formidable from "formidable";
import fs from "fs";
import { nanoid } from "nanoid";
import { uploadToS3 } from "../../../../lib/storage/s3.js";
import { requireLogin } from "../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
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

    let oldPath = files.fileToUpload.filepath;
    let rawData = fs.readFileSync(oldPath);
    //let audioBlob = new Blob([rawData]);

    const s3key = nanoid();
    const result = await uploadToS3(s3key, rawData);
    if (result.success === true) {
      res.send({ s3key });
    } else {
      res.status(400).send(result.message).end();
    }
  });
};

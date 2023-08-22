import { Request, Response } from "express";
import { getFromS3 } from "../../../../lib/storage/s3.js";
import { requireLogin } from "../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const { s3key } = req.params;
  const data = await getFromS3(s3key);
  if (data.success === true) {
    res.writeHead(200, {
      "Content-Type": "image/png",
    });
    res.end(data.data);
  } else {
    res.status(400).send(data.message).end();
  }
};

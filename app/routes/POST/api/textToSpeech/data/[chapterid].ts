import { Request, Response } from "express";
import { requireLogin } from "../../../../../lib/utils/middleware/requireLogin.js";
import { getUserId } from "../../../../../lib/authentication/firebase.js";
import { getSpeech } from "../../../../../lib/storage/firebase.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const { chapterid } = req.params;
  const userid = getUserId(req);
  const data = await getSpeech(chapterid);
  if (data && data.userid === userid) {
    return res.status(200).json(data);
  }

  res.status(403).send("no access").end();
};

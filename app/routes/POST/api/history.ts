import { Request, Response } from "express";
import { saveToHistory } from "../../../lib/storage/firebase.js";
import { Result } from "../../../lib/types.js";
import { requireLogin } from "../../../lib/utils/middleware/requireLogin.js";
import { Commit } from "../../../../src/Types.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const { chapterid, id, message, timestamp, patch } = req.body;
  const commitData: Commit = {
    id,
    message,
    timestamp,
    patch,
  };
  console.log("history/new", chapterid, commitData);

  const result: Result = await saveToHistory(chapterid, commitData);
  res.status(200).end();

  if (result.success === true) {
    res.status(200).end();
  } else {
    res.status(400).send(result.message).end();
  }
};

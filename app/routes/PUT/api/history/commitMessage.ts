import { Request, Response } from "express";
import {
  editCommitMessage,
  saveToHistory,
} from "../../../../lib/storage/firebase.js";
import { Result } from "../../../../lib/types.js";
import { requireLogin } from "../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const { chapterid, message, index } = req.body;

  console.log("editCommitMessage", chapterid, message, index);

  const result = await editCommitMessage(chapterid, message, parseInt(index));
  res.status(200).end();

  if (result.success === true) {
    res.status(200).end();
  } else {
    res.status(400).send(result.message).end();
  }
};

import { Request, Response } from "express";
import { requireLogin } from "../../../lib/utils/middleware/requireLogin.js";
import { makeNewChapter, saveChapter } from "../../../lib/storage/firebase.js";
import * as SE from "../../../lib/storage/storageEngine.js";
import { success } from "../../../lib/utils.js";
import { UpdateData } from "../../../lib/types.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const { bookid, title, text } = req.body;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;
  const chapter = makeNewChapter(text, title, bookid);
  const updateData: UpdateData = {
    eventName: "chapterCreate",
    data: { chapter, bookid },
  };
  await SE.save(req, res, updateData, async () => {
    await saveChapter(chapter, lastHeardFromServer);
    return success(chapter);
  });
};

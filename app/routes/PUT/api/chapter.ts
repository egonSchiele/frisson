import { Request, Response } from "express";
import { requireLogin } from "../../../lib/utils/middleware/requireLogin.js";
import { saveChapter } from "../../../lib/storage/firebase.js";
import * as SE from "../../../lib/storage/storageEngine.js";
import { UpdateData } from "../../../lib/types.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const { chapter } = req.body;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;
  const updateData: UpdateData = {
    eventName: "chapterUpdate",
    data: { chapter },
  };
  await SE.save(req, res, updateData, async () => {
    return await saveChapter(chapter, lastHeardFromServer);
  });
};

import { Request, Response } from "express";
import { deleteChapter } from "../../../../../lib/storage/firebase.js";
import { checkBookAccess } from "../../../../../lib/utils/middleware/checkBookAccess.js";
import { checkChapterAccess } from "../../../../../lib/utils/middleware/checkChapterAccess.js";
import { requireLogin } from "../../../../../lib/utils/middleware/requireLogin.js";
import * as SE from "../../../../../lib/storage/storageEngine.js";

export const middleware = [requireLogin, checkBookAccess, checkChapterAccess];

export default async (req: Request, res: Response) => {
  const { chapterid, bookid } = req.params;
  console.log("cookies", req.cookies);
  const lastHeardFromServer = req.cookies.lastHeardFromServer;

  const updateData = {
    eventName: "chapterDelete",
    data: { chapterid },
  };
  SE.save(req, res, updateData, async () => {
    return await deleteChapter(chapterid, bookid, lastHeardFromServer);
  });
};

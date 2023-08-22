import { Request, Response } from "express";
import { getHistory } from "../../../../../lib/storage/firebase.js";
import { checkBookAccess } from "../../../../../lib/utils/middleware/checkBookAccess.js";
import { checkChapterAccess } from "../../../../../lib/utils/middleware/checkChapterAccess.js";
import { requireLogin } from "../../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin, checkBookAccess, checkChapterAccess];

export default async (req: Request, res: Response) => {
  const { chapterid } = req.params;
  const history = await getHistory(chapterid);
  if (!history) {
    console.log(`no history with id, ${chapterid}`);
    res.status(404).end();
  } else {
    res.json(history);
  }
};

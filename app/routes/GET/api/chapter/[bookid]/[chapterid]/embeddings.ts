import { Request, Response } from "express";
import { getUser } from "../../../../../../lib/authentication/firebase.js";
import { getEmbeddings } from "../../../../../../lib/chat/getEmbeddings.js";
import { chapterToMarkdown } from "../../../../../../lib/serverUtils.js";
import { getChapter } from "../../../../../../lib/storage/firebase.js";
import { checkBookAccess } from "../../../../../../lib/utils/middleware/checkBookAccess.js";
import { checkChapterAccess } from "../../../../../../lib/utils/middleware/checkChapterAccess.js";
import { requireLogin } from "../../../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin, checkBookAccess, checkChapterAccess];

export default async (req: Request, res: Response) => {
  const chapter = await getChapter(res.locals.chapterid);

  const user = await getUser(req);
  const embeddings = await getEmbeddings(
    user,
    chapterToMarkdown(chapter, false)
  );
  res.status(200).json({ embeddings });
};

import AdmZip from "adm-zip";
import { Request, Response } from "express";
import { chapterToMarkdown } from "../../../../../../../lib/serverUtils.js";
import { getChapter } from "../../../../../../../lib/storage/firebase.js";
import { checkBookAccess } from "../../../../../../../lib/utils/middleware/checkBookAccess.js";
import { checkChapterAccess } from "../../../../../../../lib/utils/middleware/checkChapterAccess.js";
import { requireLogin } from "../../../../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin, checkBookAccess, checkChapterAccess];

export default async (req: Request, res: Response) => {
  const { title } = req.params;
  try {
    const chapter = await getChapter(res.locals.chapterid);

    res.set("Content-Disposition", `attachment; filename="${title}"`);

    res.status(200).send(chapterToMarkdown(chapter, false));
  } catch (error) {
    console.error("Error getting chapter:", error);
    res.status(400).json({ error });
  }
};

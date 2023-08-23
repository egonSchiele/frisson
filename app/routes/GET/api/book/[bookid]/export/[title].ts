import AdmZip from "adm-zip";
import { Request, Response } from "express";
import { chapterToMarkdown } from "../../../../../../lib/serverUtils.js";
import { getBook } from "../../../../../../lib/storage/firebase.js";
import { checkBookAccess } from "../../../../../../lib/utils/middleware/checkBookAccess.js";
import { requireLogin } from "../../../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin, checkBookAccess];

export default async (req: Request, res: Response) => {
  try {
    const book = await getBook(res.locals.bookid);

    // creating archives
    const zip = new AdmZip();

    book.chapters.forEach((chapter) => {
      const content = chapterToMarkdown(chapter, false);
      let title = chapter.title || "untitled";
      title = title.replace(/[^a-z0-9_]/gi, "-").toLowerCase() + ".md";
      zip.addFile(title, Buffer.from(content, "utf8"), "");
    });
    const finalZip = zip.toBuffer();

    res.status(200).send(finalZip);
  } catch (error) {
    console.error("Error getting chapter:", error);
    res.status(400).json({ error });
  }
};

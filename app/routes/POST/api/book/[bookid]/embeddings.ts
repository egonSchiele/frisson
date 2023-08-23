import { Request, Response } from "express";
import { getUser } from "../../../../../lib/authentication/firebase.js";
import { getEmbeddings } from "../../../../../lib/chat/getEmbeddings.js";
import { chapterToMarkdown } from "../../../../../lib/serverUtils.js";
import {
  getBook,
  saveEmbeddings,
  saveBook,
} from "../../../../../lib/storage/firebase.js";
import { checkBookAccess } from "../../../../../lib/utils/middleware/checkBookAccess.js";
import { requireLogin } from "../../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin, checkBookAccess];

export default async (req: Request, res: Response) => {
  const book = await getBook(res.locals.bookid);
  const chapters = book.chapters;
  const user = await getUser(req);
  const timestamp = Date.now();
  let promises = chapters
    .filter((chapter) => {
      return (
        !chapter.embeddingsLastCalculatedAt ||
        chapter.created_at > chapter.embeddingsLastCalculatedAt
      );
    })
    .map(async (chapter) => {
      const embeddings = await getEmbeddings(user, chapterToMarkdown(chapter));
      return { chapter, embeddings };
    });
  const allEmbeddings = await Promise.all(promises);
  const promises2 = allEmbeddings.map(async ({ chapter, embeddings }) => {
    if (embeddings.success !== true) {
      console.error("Error getting embeddings:", embeddings.message);
      return;
    }

    return await saveEmbeddings(chapter.chapterid, {
      embeddings: embeddings.data,
      created_at: timestamp,
    });
  });

  book.lastTrainedAt = timestamp;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;
  await Promise.all([...promises2, saveBook(book, lastHeardFromServer)]);

  res.status(200).json({ lastTrainedAt: timestamp });
};

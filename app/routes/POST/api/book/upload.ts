import { Request, Response } from "express";
import { getUser } from "../../../../lib/authentication/firebase.js";
import {
  makeNewBook,
  makeNewChapter,
  saveBook,
  saveChapter,
} from "../../../../lib/storage/firebase.js";
import * as SE from "../../../../lib/storage/storageEngine.js";
import { UpdateData } from "../../../../lib/types.js";
import { success } from "../../../../lib/utils.js";
import { requireLogin } from "../../../../lib/utils/middleware/requireLogin.js";
export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const user = await getUser(req);
  const userid = user.userid;
  const chapters = req.body.chapters;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;

  const book = makeNewBook({
    userid,
  });
  const promises = chapters.map(async (chapter) => {
    const newChapter = makeNewChapter(chapter.text, chapter.title, book.bookid);
    await saveChapter(newChapter, lastHeardFromServer);
    book.chapters.push(newChapter);
  });
  await Promise.all(promises);

  const updateData: UpdateData = {
    eventName: "bookCreate",
    data: { book },
  };
  SE.save(req, res, updateData, async () => {
    await saveBook(book, lastHeardFromServer);
    return success(book);
  });
};

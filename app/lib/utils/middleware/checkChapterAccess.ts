import { Request, Response } from "express";
import { getChapter } from "../../storage/firebase.js";

const chapterAccessCache = {};

export const checkChapterAccess = async (req: Request, res: Response, next) => {
  const c = req.cookies;

  let bookid;
  let chapterid;
  if (req.body) {
    bookid = req.body.bookid;
    chapterid = req.body.chapterid;
  }
  bookid = bookid || req.params.bookid;
  chapterid = chapterid || req.params.chapterid;

  if (!bookid || !chapterid) {
    console.log("no bookid or chapterid");
    res.redirect("/404");
  }
  const { userid } = c;
  const key = `${userid}-${bookid}-${chapterid}`;
  if (chapterAccessCache[key]) {
    res.locals.chapterid = chapterid;
    next();
    return;
  }

  const chapter = await getChapter(chapterid);

  if (!chapter) {
    console.log(`no chapter with id, ${chapterid}`);
    res.redirect("/404");
  } else if (chapter.bookid !== bookid) {
    console.log("chapter is not part of book", chapterid, bookid);
    res.redirect("/404");
  } else {
    chapterAccessCache[key] = true;
    res.locals.chapterid = chapterid;
    next();
  }
};

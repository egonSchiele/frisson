import { Request, Response } from "express";
import { getBookToCheckAccess } from "../../storage/firebase.js";

const bookAccessCache = {};
// eslint-disable-next-line consistent-return
export const checkBookAccess = async (req: Request, res: Response, next) => {
  const c = req.cookies;

  let bookid;
  if (req.body) {
    bookid = req.body.bookid;
  }
  bookid = bookid || req.params.bookid;

  if (!bookid) {
    console.log("no bookid");
    return res.redirect("/404");
  }

  const { userid } = c;
  if (!userid) {
    console.log("no userid");
    return res.redirect("/404");
  }

  const key = `${userid}-${bookid}`;
  if (bookAccessCache[key]) {
    res.locals.bookid = bookid;
    next();
    return;
  }

  const book = await getBookToCheckAccess(bookid);

  if (!book) {
    console.log(`no book with id, ${bookid}`);
    res.redirect("/404");
  } else if (book.userid !== c.userid) {
    console.log("no access to book");
    res.redirect("/404");
  } else {
    bookAccessCache[key] = true;
    res.locals.bookid = bookid;
    next();
  }
};

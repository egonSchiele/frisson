import { Request, Response } from "express";

import { getUserId } from "../../../lib/authentication/firebase.js";
import { getBooks } from "../../../lib/storage/firebase.js";
import { noCache } from "../../../lib/utils/middleware.js";
import { requireLogin } from "../../../lib/utils/middleware/requireLogin.js";
import * as SE from "../../../lib/storage/storageEngine.js";

export const middleware = [requireLogin, noCache];

export default async (req: Request, res: Response) => {
  const userid = getUserId(req);
  const books = await getBooks(userid);

  // this isn't an edit, so don't update lastEdited
  // unless necessary
  let lastEdited = SE.getLastEdited(userid);
  if (!lastEdited) {
    lastEdited = SE.updateLastEdited(req);
  }
  res.cookie("lastHeardFromServer", lastEdited);
  res.status(200).json({ books, lastEdited });
};

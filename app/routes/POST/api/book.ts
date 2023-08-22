import { success } from "../../../lib/utils.js";
import { Request, Response } from "express";
import { requireLogin } from "../../../lib/utils/middleware/requireLogin.js";
import { saveBook } from "../../../lib/storage/firebase.js";
import * as SE from "../../../lib/storage/storageEngine.js";
import { UpdateData } from "../../../lib/types.js";
import { getUserId } from "../../../lib/authentication/firebase.js";
import { makeNewBook } from "../../../lib/storage/firebase.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const userid = getUserId(req);
  const book = makeNewBook({
    userid,
  });

  const updateData: UpdateData = {
    eventName: "bookCreate",
    data: { book },
  };
  const lastHeardFromServer = req.cookies.lastHeardFromServer;
  SE.save(req, res, updateData, async () => {
    await saveBook(book, lastHeardFromServer);
    return success(book);
  });
};

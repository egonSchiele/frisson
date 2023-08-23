import { Request, Response } from "express";
import { deleteBook } from "../../../../lib/storage/firebase.js";
import { UpdateData } from "../../../../lib/types.js";
import * as SE from "../../../../lib/storage/storageEngine.js";
import { checkBookAccess } from "../../../../lib/utils/middleware/checkBookAccess.js";
import { requireLogin } from "../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin, checkBookAccess];

export default async (req: Request, res: Response) => {
  const { bookid } = req.params;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;
  const updateData: UpdateData = {
    eventName: "bookDelete",
    data: { bookid },
  };
  SE.save(req, res, updateData, async () => {
    return await deleteBook(bookid, lastHeardFromServer);
  });
};

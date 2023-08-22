import { Request, Response } from "express";
import { noCache } from "../../../lib/utils/middleware.js";
import { getUser } from "../../../lib/authentication/firebase.js";
import { requireLogin } from "../../../lib/utils/middleware/requireLogin.js";

import * as SE from "../../../lib/storage/storageEngine.js";

export const middleware = [requireLogin, noCache];

export default async (req: Request, res: Response) => {
  const lastEdited = SE.getLastEdited(req.cookies.userid);
  const prettyDate = lastEdited
    ? new Date(lastEdited).toLocaleString()
    : "never";
  console.log("userid", req.cookies.userid, "lastEdited", prettyDate);
  res.status(200).json({ lastEdited });
};

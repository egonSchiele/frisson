import { Request, Response } from "express";

import * as SE from "../../../../lib/storage/storageEngine.js";
import { requireLogin } from "../../../../lib/utils/middleware/requireLogin.js";
import { getUserId } from "../../../../lib/authentication/firebase.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  const userid = getUserId(req);
  SE.connectClient(userid, req.params.clientSessionId, req, res);
};

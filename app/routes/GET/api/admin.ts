import { Request, Response } from "express";

import { requireAdmin } from "../../../lib/utils/middleware/requireAdmin.js";
import { getUserId } from "../../../lib/authentication/firebase.js";
import { serveFile } from "../../../lib/utils/serveFile.js";

export const middleware = [requireAdmin];

export default async (req: Request, res: Response) => {
  const userid = getUserId(req);
  serveFile("admin.html", res, userid);
};

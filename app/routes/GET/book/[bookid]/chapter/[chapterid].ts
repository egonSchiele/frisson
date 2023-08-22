import { Request, Response } from "express";
import serveLibrary from "../../../../../lib/common/serveLibrary.js";
import { checkBookAccess } from "../../../../../lib/utils/middleware/checkBookAccess.js";
import { checkChapterAccess } from "../../../../../lib/utils/middleware/checkChapterAccess.js";
import { requireLogin } from "../../../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin, checkBookAccess, checkChapterAccess];

export default async (req: Request, res: Response) => {
  serveLibrary(req, res);
};

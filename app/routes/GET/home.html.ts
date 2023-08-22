import { Request, Response } from "express";
import serveLibrary from "../../lib/common/serveLibrary.js";
import { requireLogin } from "../../lib/utils/middleware/requireLogin.js";
export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  serveLibrary(req, res);
};

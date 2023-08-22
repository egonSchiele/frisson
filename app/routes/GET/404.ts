import { Request, Response } from "express";
import serveLibrary from "../../lib/common/serveLibrary.js";
import { requireLogin } from "../../lib/utils/middleware/requireLogin.js";
import path from "path";

export default async (req: Request, res: Response) => {
  res.sendFile(path.resolve("./dist/pages/404.html"));
};

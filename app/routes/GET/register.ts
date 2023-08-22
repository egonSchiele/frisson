import { Request, Response } from "express";
import { serveFile } from "../../lib/utils/serveFile.js";

export default async (req: Request, res: Response) => {
  serveFile("login-base.html", res, null);
};

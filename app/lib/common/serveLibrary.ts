import { Request, Response } from "express";
import { getUserId } from "../authentication/firebase.js";
import { isMobile } from "../utils.js";
import { serveFile } from "../utils/serveFile.js";

export default function serveLibrary(req: Request, res: Response) {
  const userid = getUserId(req);
  if (isMobile(req)) {
    serveFile("mobile.html", res, userid);
  } else {
    serveFile("library.html", res, userid);
  }
}

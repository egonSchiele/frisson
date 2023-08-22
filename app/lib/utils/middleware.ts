import { Request, Response } from "express";
import { getBookToCheckAccess, getChapter } from "../storage/firebase.js";
export const noCache = (req: Request, res: Response, next) => {
  // res.setHeader("Surrogate-Control", "no-store");
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

export const allowAutoplay = (req: Request, res: Response, next) => {
  res.setHeader("Permissions-Policy", "autoplay=(self)");
  next();
};

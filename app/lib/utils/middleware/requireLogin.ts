import { Request, Response } from "express";
import { stringToHash } from "../crypto.js";

const mainPageUrl =
  process.env.NODE_ENV === "production"
    ? "https://egonschiele.github.io/chisel-docs/"
    : "/login.html";
export const requireLogin = (req: Request, res: Response, next) => {
  const c = req.cookies;
  if (!req.cookies.userid) {
    console.log("no userid");
    res.redirect(mainPageUrl);
  } else {
    stringToHash(req.cookies.userid).then((hash) => {
      if (hash !== req.cookies.token) {
        res.redirect(mainPageUrl);
      } else {
        next();
      }
    });
  }
};

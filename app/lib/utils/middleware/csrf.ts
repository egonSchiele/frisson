import { Request, Response } from "express";
export const csrf = (req: Request, res: Response, next) => {
  //return next();
  if (req.method !== "GET") {
    const excluded = [
      "/auth/login",
      "/auth/register",
      "/auth/loginGuestUser",
      "/api/audio/upload",
      "/api/file/upload",
    ];
    if (excluded.includes(req.url)) {
      next();
      return;
    }
    const c = req.cookies;
    if (c.csrfToken === req.body.csrfToken) {
      next();
    } else {
      console.log(
        "csrf failed",
        req.url,
        req.method,
        c.csrfToken,
        req.body.csrfToken
      );
      res
        .status(400)
        .send("Could not butter your parsnips. Try refreshing your browser.")
        .end();
    }
  } else {
    next();
  }
};

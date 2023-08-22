import { Request, Response } from "express";

export default async (req: Request, res: Response) => {
  res.clearCookie("userid");
  res.clearCookie("token");
  res.clearCookie("csrfToken");
  res.clearCookie("lastHeardFromServer");
  res.redirect("/login");
};

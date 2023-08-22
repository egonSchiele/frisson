import { Request, Response } from "express";
import { submitLogin } from "../../../lib/authentication/firebase.js";

export default async (req: Request, res: Response) => {
  await submitLogin(req, res);
};

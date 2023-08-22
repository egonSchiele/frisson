import { Request, Response } from "express";
import { loginGuestUser } from "../../../lib/authentication/firebase.js";

export const disabled = true;

export default async (req: Request, res: Response) => {
  await loginGuestUser(req, res);
};

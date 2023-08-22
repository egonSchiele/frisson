import { Request, Response } from "express";
import { submitRegister } from "../../../lib/authentication/firebase.js";

export default async (req: Request, res: Response) => {
  await submitRegister(req, res);
};

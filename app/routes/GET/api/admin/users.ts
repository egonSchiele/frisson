import { Request, Response } from "express";
import { getUsers } from "../../../../lib/authentication/firebase.js";
import { requireAdmin } from "../../../../lib/utils/middleware/requireAdmin.js";

export const middleware = [requireAdmin];

export default async (req: Request, res: Response) => {
  const data = await getUsers();
  res.status(200).end();
};

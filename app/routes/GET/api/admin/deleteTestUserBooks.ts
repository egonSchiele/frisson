import { Request, Response } from "express";
import { deleteBooks } from "../../../../lib/storage/firebase.js";
import { requireAdmin } from "../../../../lib/utils/middleware/requireAdmin.js";

export const middleware = [requireAdmin];

export default async (req: Request, res: Response) => {
  await deleteBooks("ZMLuWv0J2HkI30kEfm5xs");
  res.status(200).end();
};

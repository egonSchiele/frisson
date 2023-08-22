import { Request, Response } from "express";
import { requireAdmin } from "../../../../lib/utils/middleware/requireAdmin.js";
import { resetMonthlyTokenCounts } from "../../../../lib/authentication/firebase.js";

export const middleware = [requireAdmin];

export default async (req: Request, res: Response) => {
  await resetMonthlyTokenCounts();
  res.status(200).end();
};

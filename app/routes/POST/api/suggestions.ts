import { Request, Response } from "express";
import settings from "../../../config/settings.js";
import { getUser } from "../../../lib/authentication/firebase.js";
import { getSuggestions } from "../../../lib/chat/getSuggestions.js";
import { substringTokens } from "../../../lib/serverUtils.js";
import { requireLogin } from "../../../lib/utils/middleware/requireLogin.js";

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  console.log({ body: req.body });
  const user = await getUser(req);
  const prompt = substringTokens(req.body.prompt, settings.maxPromptLength);
  const suggestions = await getSuggestions(
    user,
    prompt,
    req.body.max_tokens,
    req.body.model,
    req.body.num_suggestions,
    req.body.messages || [],
    req.body.customKey
  );
  if (suggestions.success === true) {
    res.status(200).json(suggestions.data);
  } else {
    res.status(400).json({ error: suggestions.message });
  }
};

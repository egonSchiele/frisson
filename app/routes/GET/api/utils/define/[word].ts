import { Request, Response } from "express";
import { requireLogin } from "../../../../../lib/utils/middleware/requireLogin.js";
import wordnet from "wordnet";

console.log("Initializing wordnet");
await wordnet.init("wordnet");

export const middleware = [requireLogin];

export default async (req: Request, res: Response) => {
  try {
    const definitions = await wordnet.lookup(req.params.word);
    definitions.forEach((definition) => {
      if (definition.meta && definition.meta.pointers) {
        delete definition.meta.pointers;
      }
    });
    res.status(200).json(definitions);
  } catch (error) {
    console.error("No definitions found for word:", req.params.word);
    res
      .status(400)
      .json({ error: `No definitions found for word: '${req.params.word}'` });
  }
};

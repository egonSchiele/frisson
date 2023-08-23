import similarity from "compute-cosine-similarity";
import { Request, Response } from "express";
import { getUser } from "../../../../../lib/authentication/firebase.js";
import { getEmbeddings } from "../../../../../lib/chat/getEmbeddings.js";
import {
  chapterToMarkdown,
  countTokens,
  substringTokens,
} from "../../../../../lib/serverUtils.js";
import {
  getBook,
  saveEmbeddings,
  saveBook,
  getChaptersForBook,
  getEmbeddingsForChapter,
} from "../../../../../lib/storage/firebase.js";
import { checkBookAccess } from "../../../../../lib/utils/middleware/checkBookAccess.js";
import { requireLogin } from "../../../../../lib/utils/middleware/requireLogin.js";
import settings from "../../../../../config/settings.js";

export const middleware = [requireLogin, checkBookAccess];

export default async (req: Request, res: Response) => {
  const book = await getBook(res.locals.bookid);
  const chapters = await getChaptersForBook(book.bookid);
  const user = await getUser(req);
  const { question } = req.body;
  const questionEmbeddings = await getEmbeddings(user, question);

  if (questionEmbeddings.success === false) {
    res.status(400).json({ error: "No embeddings found for question" });
    return;
  }
  // Use cosine similarity to find the most similar chapter.
  // We will use that as context for GPT when asking our question

  const blocksAndSimilarityScores = [];
  const promises = chapters.map(async (chapter) => {
    const _embeddings = await getEmbeddingsForChapter(chapter.chapterid);
    if (!_embeddings) {
      console.log("No embeddings for chapter:", chapter.chapterid);
      return;
    }
    const embeddings = _embeddings.embeddings;
    if (embeddings.length === 0) {
      console.error("Number of embeddings is zero");
      return;
    }
    const similarityScore = similarity(questionEmbeddings.data, embeddings);
    blocksAndSimilarityScores.push({
      chapter,
      similarityScore,
    });
  });

  await Promise.all(promises);

  if (blocksAndSimilarityScores.length === 0) {
    res.status(400).json({ error: "No embeddings found for book" });
    return;
  }

  const numBlocksToConsider = Math.min(3, blocksAndSimilarityScores.length);
  const mostSimilarBlocks = blocksAndSimilarityScores.sort(
    (a, b) => b.similarityScore - a.similarityScore
  );
  let context = mostSimilarBlocks
    .slice(0, numBlocksToConsider)
    .map(({ chapter }) => chapterToMarkdown(chapter, false))
    .join("\n\n");

  let prompt = `Context: ${context}`;
  const qandaString = `\n\nQuestion: ${question}\n\nAnswer:`;
  prompt = substringTokens(
    prompt,
    settings.maxPromptLength - countTokens(qandaString)
  );
  prompt += qandaString;
  // TODO fix this getSuggestions call
  // @ts-ignore
  const suggestions = await getSuggestions(user, prompt);

  if (suggestions.success === true) {
    const answer = suggestions.data.choices[0].text;
    res.status(200).json({
      answer,
      /* chapterid: mostSimilarBlock.chapter.chapterid,
      blockIndex: mostSimilarBlock.i, */
      chapterid: null,
      blockIndex: null,
    });
  } else {
    res.status(400).json({ error: suggestions.error });
  }
};

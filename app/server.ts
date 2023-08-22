import compression from "compression";
import similarity from "compute-cosine-similarity";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import wordnet from "wordnet";
import { getEmbeddings } from "./lib/chat/getEmbeddings.js";
import { isMobile } from "./lib/utils.js";
import { allowAutoplay, noCache } from "./lib/utils/middleware.js";
import { checkBookAccess } from "./lib/utils/middleware/checkBookAccess.js";
import { checkChapterAccess } from "./lib/utils/middleware/checkChapterAccess.js";
import { csrf } from "./lib/utils/middleware/csrf.js";
import { requireAdmin } from "./lib/utils/middleware/requireAdmin.js";
import { requireLogin } from "./lib/utils/middleware/requireLogin.js";
import { serveFile } from "./lib/utils/serveFile.js";

import AdmZip from "adm-zip";
import cookieParser from "cookie-parser";
import settings from "./config/settings.js";
import {
  getUser,
  getUserId,
  getUsers,
  resetMonthlyTokenCounts,
  saveUser,
} from "./lib/authentication/firebase.js";
import { getSuggestions } from "./lib/chat/getSuggestions.js";
import {
  chapterToMarkdown,
  countTokens,
  substringTokens,
} from "./lib/serverUtils.js";
import {
  deleteBook,
  deleteBooks,
  deleteChapter,
  getBook,
  getBookTitles,
  getBooks,
  getChapter,
  getChaptersForBook,
  getEmbeddingsForChapter,
  saveBook,
  saveEmbeddings,
} from "./lib/storage/firebase.js";

import * as SE from "./lib/storage/storageEngine.js";
import { processDir } from "./lib/utils/processDir.js";

console.log("Initializing wordnet");
await wordnet.init("wordnet");
//const list = await wordnet.list();

//console.log(JSON.stringify(definitions, null, 2));

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(
  express.urlencoded({
    limit: "5mb",
    extended: true,
  })
);
app.use(compression());

app.use(express.static("public"));
app.use(express.static("dist"));

app.use(cookieParser());
app.disable("x-powered-by");
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply the rate limiting middleware to API calls only
app.use("/api", apiLimiter);
app.use("/auth/loginGuestUser", apiLimiter);

app.use(csrf);

//app.use(noCache);
app.use(allowAutoplay);

app.post("/api/settings", requireLogin, async (req, res) => {
  const { settings } = req.body;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;
  //console.log("saving settings", settings);
  if (!settings) {
    console.log("no settings");
    res.status(404).end();
  } else {
    const user = await getUser(req);
    if (!user) {
      console.log("no user");
      res.status(404).end();
    } else {
      // we add these onto settings before sending to the frontend, but don't actually want to save them in the settings field.
      // they'll be saved directly on the user instead.
      delete settings.admin;
      delete settings.email;
      delete settings.permissions;

      const updateData = {
        eventName: "settingsUpdate",
        data: { settings },
      };
      SE.save(req, res, updateData, async () => {
        user.settings = settings;
        return await saveUser(user);
      });
    }
  }
});

app.get("/api/books", requireLogin, noCache, async (req, res) => {
  const userid = getUserId(req);
  const books = await getBooks(userid);

  // this isn't an edit, so don't update lastEdited
  // unless necessary
  let lastEdited = SE.getLastEdited(userid);
  if (!lastEdited) {
    lastEdited = SE.updateLastEdited(req);
  }
  res.cookie("lastHeardFromServer", lastEdited);
  res.status(200).json({ books, lastEdited });
});

app.post("/api/deleteBook", requireLogin, checkBookAccess, async (req, res) => {
  const { bookid } = req.body;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;
  const updateData = {
    eventName: "bookDelete",
    data: { bookid },
  };
  SE.save(req, res, updateData, async () => {
    return await deleteBook(bookid, lastHeardFromServer);
  });
});

app.get(
  "/api/exportBook/:bookid/:title",
  requireLogin,
  checkBookAccess,
  async (req, res) => {
    try {
      const book = await getBook(res.locals.bookid);

      // creating archives
      const zip = new AdmZip();

      book.chapters.forEach((chapter) => {
        const content = chapterToMarkdown(chapter, false);
        let title = chapter.title || "untitled";
        title = title.replace(/[^a-z0-9_]/gi, "-").toLowerCase() + ".md";
        zip.addFile(title, Buffer.from(content, "utf8"), "");
      });
      const finalZip = zip.toBuffer();

      res.status(200).send(finalZip);
    } catch (error) {
      console.error("Error getting chapter:", error);
      res.status(400).json({ error });
    }
  }
);
app.get(
  "/api/exportChapter/:bookid/:chapterid/:title",
  requireLogin,
  checkBookAccess,
  checkChapterAccess,
  async (req, res) => {
    const { title } = req.params;
    try {
      const chapter = await getChapter(res.locals.chapterid);

      res.set("Content-Disposition", `attachment; filename="${title}"`);

      res.status(200).send(chapterToMarkdown(chapter, false));
    } catch (error) {
      console.error("Error getting chapter:", error);
      res.status(400).json({ error });
    }
  }
);

app.get(
  "/api/chapter/:bookid/:chapterid",
  requireLogin,
  checkBookAccess,
  checkChapterAccess,
  async (req, res) => {
    try {
      const chapter = await getChapter(res.locals.chapterid);

      res.status(200).json(chapter);
    } catch (error) {
      console.error("Error getting chapter:", error);
      res.status(400).json({ error });
    }
  }
);

app.post(
  "/api/deleteChapter",
  requireLogin,
  checkBookAccess,
  checkChapterAccess,
  async (req, res) => {
    const { chapterid, bookid } = req.body;
    console.log("cookies", req.cookies);
    const lastHeardFromServer = req.cookies.lastHeardFromServer;

    const updateData = {
      eventName: "chapterDelete",
      data: { chapterid },
    };
    SE.save(req, res, updateData, async () => {
      return await deleteChapter(chapterid, bookid, lastHeardFromServer);
    });
  }
);

app.post("/api/suggestions", requireLogin, async (req, res) => {
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
});

app.get("/admin", requireAdmin, async (req, res) => {
  const userid = getUserId(req);
  serveFile("admin.html", res, userid);
});
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const data = await getUsers();
  res.status(200).json(data);
});

app.get("/api/admin/deleteTestUserBooks", requireAdmin, async (req, res) => {
  await deleteBooks("ZMLuWv0J2HkI30kEfm5xs");
  res.status(200).end();
});

app.get(
  "/api/admin/resetMonthlyTokenCounts",
  requireAdmin,
  async (req, res) => {
    await resetMonthlyTokenCounts();
    res.status(200).end();
  }
);

app.get(
  "/api/getEmbeddings/:bookid/:chapterid",
  requireLogin,
  checkBookAccess,
  checkChapterAccess,
  async (req, res) => {
    const chapter = await getChapter(res.locals.chapterid);

    const user = await getUser(req);
    const embeddings = await getEmbeddings(
      user,
      chapterToMarkdown(chapter, false)
    );
    res.status(200).json({ embeddings });
  }
);

app.get("/api/sseUpdates/:clientSessionId", requireLogin, async (req, res) => {
  const userid = getUserId(req);
  SE.connectClient(userid, req.params.clientSessionId, req, res);
});

app.get(
  "/api/trainOnBook/:bookid",
  requireLogin,
  checkBookAccess,
  async (req, res) => {
    const book = await getBook(res.locals.bookid);
    const chapters = book.chapters;
    const user = await getUser(req);
    const timestamp = Date.now();
    let promises = chapters
      .filter((chapter) => {
        return (
          !chapter.embeddingsLastCalculatedAt ||
          chapter.created_at > chapter.embeddingsLastCalculatedAt
        );
      })
      .map(async (chapter) => {
        const embeddings = await getEmbeddings(
          user,
          chapterToMarkdown(chapter)
        );
        return { chapter, embeddings };
      });
    const allEmbeddings = await Promise.all(promises);
    promises = allEmbeddings.map(async ({ chapter, embeddings }) => {
      if (!embeddings.success === true) {
        console.error("Error getting embeddings:", embeddings.message);
        return;
      }

      await saveEmbeddings(chapter.chapterid, {
        embeddings: embeddings.data,
        created_at: timestamp,
      });
      /* chapter.embeddingsLastCalculatedAt = timestamp;
      await saveChapter(chapter); */
    });

    book.lastTrainedAt = timestamp;
    const lastHeardFromServer = req.cookies.lastHeardFromServer;
    await Promise.all([...promises, saveBook(book, lastHeardFromServer)]);

    res.status(200).json({ lastTrainedAt: timestamp });
  }
);

app.get(
  "/api/define/:word",
  requireLogin,

  async (req, res) => {
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
  }
);

app.post(
  "/api/askQuestion/:bookid",
  requireLogin,
  checkBookAccess,
  async (req, res) => {
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
  }
);

processDir(app, "./build/routes/GET", "build/routes/GET", "GET");
processDir(app, "./build/routes/POST", "build/routes/POST", "POST");
processDir(app, "./build/routes/PUT", "build/routes/PUT", "PUT");
processDir(app, "./build/routes/DELETE", "build/routes/DELETE", "DELETE");

const port = process.env.PORT || 80;
app.listen(port, () => console.log(`Server running on port ${port}`));

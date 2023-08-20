import { Blob } from "buffer";
import { exec, execSync } from "child_process";
import secondaryBlocklist from "./secondaryBlocklist.js";
import instantBlocklist from "./instantBlocklist.js";
import { HfInference } from "@huggingface/inference";
import formidable from "formidable";
import blocklist from "./src/blocklist.js";
import wordnet from "wordnet";
import zip from "lodash";
import similarity from "compute-cosine-similarity";
import rateLimit from "express-rate-limit";
import express, { response } from "express";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import browser from "browser-detect";
import * as fs from "fs";
import path from "path";
import util from "util";
import cookieParser from "cookie-parser";
import AdmZip from "adm-zip";
import { nanoid } from "nanoid";
import handlebars from "handlebars";
import {
  requireLogin,
  requireAdmin,
  submitLogin,
  submitRegister,
  getUserId,
  getUser,
  getUsers,
  getGuestUsers,
  saveUser,
  getBooksForUser,
  loginGuestUser,
  resetMonthlyTokenCounts,
} from "./src/authentication/firebase.js";
import {
  saveBook,
  getBook,
  deleteBook,
  getBooks,
  getBookTitles,
  saveChapter,
  deleteChapter,
  getChapter,
  editCommitMessage,
  saveToHistory,
  getHistory,
  makeNewBook,
  makeNewChapter,
  deleteBooks,
  success,
  failure,
  getChaptersForBook,
  getBookToCheckAccess,
  saveEmbeddings,
  getEmbeddingsForChapter,
  saveSpeech,
  getSpeech,
} from "./src/storage/firebase.js";
import settings from "./settings.js";
import {
  chapterToMarkdown,
  toMarkdown,
  countTokens,
  substringTokens,
  hasPermission,
  updatePermissionLimit,
} from "./src/serverUtils.js";
import Replicate from "replicate";
import {
  textToSpeech,
  textToSpeechLong,
  getTaskStatus,
} from "./src/speech/polly.js";

import { getFromS3, uploadToS3 } from "./src/storage/s3.js";
import * as SE from "./src/storage/storageEngine.js";
const replicate = new Replicate({
  // get your token from https://replicate.com/account
  auth: settings.replicateApiKey,
});

console.log("Initializing wordnet");
await wordnet.init("wordnet");
//const list = await wordnet.list();

const execAwait = util.promisify(exec);
const writeFileAwait = util.promisify(fs.writeFile);

//console.log(JSON.stringify(definitions, null, 2));

dotenv.config();

const app = express();
app.use(cors());
/* app.use(
  express.raw({
    limit: "25mb",
    type: ["multipart/form-data", "application/octet-stream"],
  })
);
 */ app.use(express.json({ limit: "5mb" }));
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
app.use("/loginGuestUser", apiLimiter);

const noCache = (req, res, next) => {
  // res.setHeader("Surrogate-Control", "no-store");
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
};

const allowAutoplay = (req, res, next) => {
  res.setHeader("Permissions-Policy", "autoplay=(self)");
  next();
};

function isMobile(req) {
  return browser(req.headers["user-agent"]).mobile;
}

const csrf = (req, res, next) => {
  return next();
  if (req.method !== "GET") {
    const excluded = [
      "/submitLogin",
      "/submitRegister",
      "/loginGuestUser",
      "/api/uploadAudio",
      "/api/upload",
    ];
    if (excluded.includes(req.url)) {
      next();
      return;
    }
    const c = req.cookies;
    if (c.csrfToken === req.body.csrfToken) {
      next();
    } else {
      console.log(
        "csrf failed",
        req.url,
        req.method,
        c.csrfToken,
        req.body.csrfToken
      );
      res
        .status(400)
        .send("Could not butter your parsnips. Try refreshing your browser.")
        .end();
    }
  } else {
    next();
  }
};

app.use(csrf);

async function run(cmd) {
  console.log(`$ ${cmd}`);
  const resp = await execAwait(cmd);

  return resp.stdout?.toString("UTF8");
}

const bookAccessCache = {};
const chapterAccessCache = {};

// eslint-disable-next-line consistent-return
const checkBookAccess = async (req, res, next) => {
  const c = req.cookies;

  let bookid;
  if (req.body) {
    bookid = req.body.bookid;
  }
  bookid = bookid || req.params.bookid;

  if (!bookid) {
    console.log("no bookid");
    return res.redirect("/404");
  }

  const { userid } = c;
  if (!userid) {
    console.log("no userid");
    return res.redirect("/404");
  }

  const key = `${userid}-${bookid}`;
  if (bookAccessCache[key]) {
    res.locals.bookid = bookid;
    next();
    return;
  }

  const book = await getBookToCheckAccess(bookid);

  if (!book) {
    console.log(`no book with id, ${bookid}`);
    res.redirect("/404");
  } else if (book.userid !== c.userid) {
    console.log("no access to book");
    res.redirect("/404");
  } else {
    bookAccessCache[key] = true;
    res.locals.bookid = bookid;
    next();
  }
};

const checkChapterAccess = async (req, res, next) => {
  const c = req.cookies;

  let bookid;
  let chapterid;
  if (req.body) {
    bookid = req.body.bookid;
    chapterid = req.body.chapterid;
  }
  bookid = bookid || req.params.bookid;
  chapterid = chapterid || req.params.chapterid;

  if (!bookid || !chapterid) {
    console.log("no bookid or chapterid");
    res.redirect("/404");
  }
  const { userid } = c;
  const key = `${userid}-${bookid}-${chapterid}`;
  if (chapterAccessCache[key]) {
    res.locals.chapterid = chapterid;
    next();
    return;
  }

  const chapter = await getChapter(chapterid);

  if (!chapter) {
    console.log(`no chapter with id, ${chapterid}`);
    res.redirect("/404");
  } else if (chapter.bookid !== bookid) {
    console.log("chapter is not part of book", chapterid, bookid);
    res.redirect("/404");
  } else {
    chapterAccessCache[key] = true;
    res.locals.chapterid = chapterid;
    next();
  }
};

//app.use(noCache);
app.use(allowAutoplay);

app.post("/submitLogin", async (req, res) => {
  await submitLogin(req, res);
});

app.post("/submitRegister", async (req, res) => {
  await submitRegister(req, res);
});

app.post("/loginGuestUser", async (req, res) => {
  await loginGuestUser(req, res);
});

app.get("/logout", async (req, res) => {
  res.clearCookie("userid");
  res.clearCookie("token");
  res.redirect("/login");
});

app.post("/api/saveBook", requireLogin, async (req, res) => {
  const { book } = req.body;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;

  const updateData = {
    eventName: "bookUpdate",
    data: { book },
  };
  await SE.save(req, res, updateData, async () => {
    return await saveBook(book, lastHeardFromServer);
  });
});

app.post("/api/saveChapter", requireLogin, async (req, res) => {
  const { chapter } = req.body;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;
  const updateData = {
    eventName: "chapterUpdate",
    data: { chapter },
  };
  await SE.save(req, res, updateData, async () => {
    return await saveChapter(chapter, lastHeardFromServer);
  });
});

app.post("/api/newBook", requireLogin, async (req, res) => {
  const userid = getUserId(req);
  const book = makeNewBook({
    userid,
  });

  const updateData = {
    eventName: "bookCreate",
    data: { book },
  };
  const lastHeardFromServer = req.cookies.lastHeardFromServer;
  SE.save(req, res, updateData, async () => {
    await saveBook(book, lastHeardFromServer);
    return success(book);
  });
});

app.post("/api/uploadAudio", requireLogin, async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    console.log("no user");
    return res.status(404).end();
  } else {
    const permissionCheck = hasPermission(user, "openai_api_whisper");
    if (!permissionCheck.success) {
      console.log("no whisper permission");
      return res.status(400).send(permissionCheck.message).end();
    }
  }
  /* const updateLimit = await updatePermissionLimit(user, "openai_api_whisper");
  if (!updateLimit.success) {
    res.status(400).send(updateLimit.message).end();
    return;
  } */
  const form = formidable({ multiples: true });
  form.parse(req, async (err, fields, files) => {
    console.log({ err, fields, files });
    if (err) {
      res.writeHead(err.httpCode || 400, { "Content-Type": "text/plain" });
      res.end(String(err));
      return;
    }

    const c = req.cookies;
    if (c.csrfToken !== fields.csrfToken) {
      console.log("csrf token mismatch");
      res
        .status(400)
        .send(
          "Could not butter your uploaded parsnips. Try refreshing your browser."
        )
        .end();
      return;
    }

    const oldPath = files.audioFile.filepath;
    const ext = path.extname(files.audioFile.originalFilename);
    const newPath = "uploads/" + nanoid() + ext;
    console.log({ newPath, oldPath });
    const rawData = fs.readFileSync(oldPath);

    await run("mkdir -p uploads");
    await writeFileAwait(newPath, rawData, function (err) {
      if (err) console.log(err);
    });

    let mp3Path = newPath.replaceAll(".wav", ".mp3");
    mp3Path = mp3Path.replaceAll(".m4a", ".mp3");

    if (newPath !== mp3Path) {
      const convert = await run(`ffmpeg -y -i ${newPath} ${mp3Path}`);
      console.log({ convert });
    }
    const response = await run(`
    curl --request POST \
  --url https://api.openai.com/v1/audio/transcriptions \
  --header 'Authorization: Bearer ${settings.openAiApiKey}' \
  --header 'Content-Type: multipart/form-data' \
  --form file=@${mp3Path} \
  --form model=whisper-1`);
    await run(`rm ${mp3Path}`);
    await run(`rm ${newPath}`);
    console.log({ response });
    const json = JSON.parse(response);
    if (json.error) {
      console.log(json.error);
      res.status(400).send(json.error.message).end();
      return;
    }
    res.json(json).end();
  });
});

app.post("/api/upload", requireLogin, async (req, res) => {
  const form = formidable({ multiples: true });
  form.parse(req, async (err, fields, files) => {
    console.log({ err, fields, files });
    if (err) {
      res.writeHead(err.httpCode || 400, { "Content-Type": "text/plain" });
      res.end(String(err));
      return;
    }

    const c = req.cookies;
    if (c.csrfToken !== fields.csrfToken) {
      console.log("csrf token mismatch");
      res
        .status(400)
        .send(
          "Could not butter your uploaded parsnips. Try refreshing your browser."
        )
        .end();
      return;
    }

    let oldPath = files.fileToUpload.filepath;
    let rawData = fs.readFileSync(oldPath);
    //let audioBlob = new Blob([rawData]);

    const s3key = nanoid();
    const result = await uploadToS3(s3key, rawData);
    if (result.success) {
      res.send({ s3key });
    } else {
      res.status(400).send(result.message).end();
    }
  });
});

app.get("/image/:s3key", requireLogin, async (req, res) => {
  const { s3key } = req.params;
  const data = await getFromS3(s3key);
  if (data.success) {
    res.writeHead(200, {
      "Content-Type": "image/png",
      /*       "Content-disposition": "inline;filename=chiselaudio.mp3",
      "Content-Length": data.data.length,
 */
    });
    res.end(data.data);
  } else {
    res.status(400).send(data.message).end();
  }
});

app.post("/api/uploadBook", requireLogin, async (req, res) => {
  const user = await getUser(req);
  const userid = user.userid;
  const chapters = req.body.chapters;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;

  const book = makeNewBook({
    userid,
  });
  const promises = chapters.map(async (chapter) => {
    const newChapter = makeNewChapter(chapter.text, chapter.title, book.bookid);
    await saveChapter(newChapter, lastHeardFromServer);
    book.chapters.push(newChapter);
  });
  await Promise.all(promises);
  /*const promptText = chapters
    .map((chapter) => chapter.text)
    .join("\n\n")
    .substring(0, 10000);

  const prompt = `Given this text, give me a synopsis of the book as well as its major characters. For the characters, return a name, description, and image URL of what you think this character looks like. Also include links to any other books you think are related. Here's the text: ${promptText}`;

  const schema =
    " {title:string, author:string, synopsis: string, characters: [{name: string, description: string, imageUrl:string}], links:string[]}";
  const max_tokens = 1500;
  const num_suggestions = 1;
  const model = "gpt-3.5-turbo";

  const suggestions = await getSuggestionsJSON(
    user,
    prompt,
    max_tokens,
    model,
    num_suggestions,
    schema
  );

  if (suggestions.success) {
    try {
      const { title, author, synopsis, characters, links } = suggestions.data;
      book.synopsis = synopsis + "\n\n" + links.join("\n");
      book.characters = characters;
      book.title = title;
      book.author = author;
    } catch (e) {
      console.log(e);
      book.synopsis = JSON.stringify(suggestions.data);
    }
  } else {
    book.synopsis = suggestions.message;
  }*/

  const updateData = {
    eventName: "bookCreate",
    data: { book },
  };
  SE.save(req, res, updateData, async () => {
    await saveBook(book, lastHeardFromServer);
    return success(book);
  });
});

app.post("/api/newChapter", requireLogin, checkBookAccess, async (req, res) => {
  const { bookid, title, text } = req.body;
  const lastHeardFromServer = req.cookies.lastHeardFromServer;
  const chapter = makeNewChapter(text, title, bookid);
  const updateData = {
    eventName: "chapterCreate",
    data: { chapter, bookid },
  };
  await SE.save(req, res, updateData, async () => {
    await saveChapter(chapter, lastHeardFromServer);
    return success(chapter);
  });
});

app.post("/api/saveToHistory", requireLogin, async (req, res) => {
  const { chapterid, id, message, timestamp, patch } = req.body;
  const commitData = {
    id,
    message,
    timestamp,
    patch,
  };
  console.log("saveToHistory", chapterid, commitData);

  const result = await saveToHistory(chapterid, commitData);
  res.status(200).end();

  if (result.success) {
    res.status(200).end();
  } else {
    res.status(400).send(result.message).end();
  }
});

app.post("/api/history/editCommitMessage", requireLogin, async (req, res) => {
  const { chapterid, message, index } = req.body;

  console.log("editCommitMessage", chapterid, message, index);

  const result = await editCommitMessage(chapterid, message, parseInt(index));
  res.status(200).end();

  if (result.success) {
    res.status(200).end();
  } else {
    res.status(400).send(result.message).end();
  }
});

function mk(prompt, schema = null) {
  return { prompt, schema };
}

app.get(
  "/api/chain2",
  requireAdmin,

  async (req, res) => {
    const suggestions = await chain(req, "", []);
    console.log(JSON.stringify(suggestions));

    res.json(suggestions);
  }
);

async function chain(req, promptText, steps) {
  const max_tokens = 500;
  const num_suggestions = 1;
  const model = "gpt-3.5-turbo";
  const user = await getUser(req);
  let result = [];
  for (const step of steps) {
    let prompt = step.prompt;
    if (typeof prompt === "function") {
      try {
        prompt = prompt(result.at(-1));
      } catch (e) {
        console.log(e);
        return {
          success: false,
          message: `Couldn't apply prompt in chain: ${e.message}`,
        };
      }
    }
    if (prompt === null) continue;
    prompt = prompt.replace("{{text}}", promptText);
    console.log({ prompt });
    const schema = step.schema;
    let suggestions;
    if (schema) {
      suggestions = await getSuggestionsJSON(
        user,
        prompt,
        max_tokens,
        model,
        num_suggestions,
        schema
      );
    } else {
      suggestions = await getSuggestions(
        user,
        prompt,
        max_tokens,
        model,
        num_suggestions,
        null,
        null
      );
    }
    console.log("suggestions: " + JSON.stringify(suggestions));
    if (!suggestions.success) {
      console.log(suggestions.message);
      return suggestions;
    } else {
      if (schema) {
        result.push(suggestions.data);
      } else {
        result.push(suggestions.data.choices[0].text);
      }
    }
  }
  return result;
}

app.get(
  "/api/getHistory/:bookid/:chapterid",
  requireLogin,
  checkBookAccess,
  checkChapterAccess,
  async (req, res) => {
    const { chapterid } = req.params;
    const history = await getHistory(chapterid);
    if (!history) {
      console.log(`no history with id, ${chapterid}`);
      res.status(404).end();
    } else {
      res.json(history);
    }
  }
);

const fileCache = {};
const render = (filename, _data) => {
  let template;
  const data = { ..._data };
  if (!fileCache[filename]) {
    const source = fs.readFileSync(filename, { encoding: "utf8", flag: "r" });
    template = handlebars.compile(source);
    fileCache[filename] = template;
  } else {
    template = fileCache[filename];
  }
  const result = template(data);

  return result;
};

const csrfTokenCache = {};
function serveFile(filename, res, userid) {
  let token;

  if (userid && csrfTokenCache[userid]) {
    token = csrfTokenCache[userid];
  } else {
    token = nanoid();
    if (userid) csrfTokenCache[userid] = token;
  }
  const lastEdited = SE.getLastEdited(userid);
  res.cookie("csrfToken", token);
  console.log(`serving ${filename}`);
  const rendered = render(path.resolve(`./dist/${filename}`), {
    csrfToken: token,
    lastEdited,
  });
  res.send(rendered).end();
}

app.get("/login", async (req, res) => {
  serveFile("login-base.html", res, null);
});

app.get("/register", async (req, res) => {
  serveFile("login-base.html", res, null);
});

app.get("/login.html", async (req, res) => {
  serveFile("login-base.html", res, null);
});

app.get("/register.html", async (req, res) => {
  serveFile("login-base.html", res, null);
});

app.get(
  "/book/:bookid/chapter/:chapterid/:textindex",
  requireLogin,
  checkBookAccess,
  checkChapterAccess,
  async (req, res) => {
    const userid = getUserId(req);
    if (isMobile(req)) {
      serveFile("mobile.html", res, userid);
    } else {
      serveFile("library.html", res, userid);
    }
  }
);
app.get(
  "/book/:bookid/chapter/:chapterid",
  requireLogin,
  checkBookAccess,
  checkChapterAccess,
  async (req, res) => {
    const userid = getUserId(req);
    if (isMobile(req)) {
      serveFile("mobile.html", res, userid);
    } else {
      serveFile("library.html", res, userid);
    }
  }
);

app.get("/", requireLogin, async (req, res) => {
  const userid = getUserId(req);
  if (isMobile(req)) {
    serveFile("mobile.html", res, userid);
  } else {
    serveFile("library.html", res, userid);
  }
});

app.get("/home.html", requireLogin, async (req, res) => {
  const userid = getUserId(req);
  if (isMobile(req)) {
    serveFile("mobile.html", res, userid);
  } else {
    serveFile("library.html", res, userid);
  }
});

app.get("/404", async (req, res) => {
  res.sendFile(path.resolve("./dist/404.html"));
});

app.get("/api/settings", requireLogin, noCache, async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    console.log("no user");
    res.status(404).end();
  } else {
    const settings = user.settings;
    settings.admin = user.admin;
    settings.email = user.email;
    settings.permissions = user.permissions;
    res.status(200).json({ settings, usage: user.usage });
  }
});

app.post("/api/textToSpeechLong", requireLogin, async (req, res) => {
  const user = await getUser(req);
  const { chapterid, text } = req.body;
  const truncatedText = text.substring(0, 100_000);
  const filename = "test.mp3";
  if (!user) {
    console.log("no user");
    res.status(404).end();
  } else {
    const permissionCheck = hasPermission(
      user,
      "amazon_polly",
      truncatedText.length
    );
    if (permissionCheck.success) {
      const updateLimit = await updatePermissionLimit(
        user,
        saveUser,
        "amazon_polly",
        truncatedText.length
      );
      if (!updateLimit.success) {
        res.status(400).send(updateLimit.message).end();
        return;
      }

      const task_id = await textToSpeechLong(truncatedText, filename, res);
      res.json({ success: true, task_id });
    } else {
      console.log("no polly permission");
      res.status(400).send(permissionCheck.message).end();
    }
  }
});

app.post("/api/textToSpeech", requireLogin, async (req, res) => {
  const user = await getUser(req);
  const { text } = req.body;
  const truncatedText = text.substring(0, 3000);

  if (!user) {
    console.log("no user");
    res.status(404).end();
  } else {
    const permissionCheck = hasPermission(
      user,
      "amazon_polly",
      truncatedText.length
    );
    if (permissionCheck.success) {
      const updateLimit = await updatePermissionLimit(
        user,
        saveUser,
        "amazon_polly",
        truncatedText.length
      );
      if (!updateLimit.success) {
        res.status(400).send(updateLimit.message).end();
        return;
      }
      const filename = "test.mp3";
      await textToSpeech(truncatedText, filename, res);
      console.log("piping");
      const data = fs.readFileSync(filename);
      res.writeHead(200, {
        "Content-Type": "audio/mpeg",
        "Content-disposition": "inline;filename=" + filename,
        "Content-Length": data.length,
      });
      res.end(data);
    } else {
      console.log("no polly permission");
      res.status(400).send(permissionCheck.message).end();
    }
  }
});

app.get(
  "/api/textToSpeech/task/:chapterid/:task_id",
  requireAdmin,
  async (req, res) => {
    try {
      const { chapterid, task_id } = req.params;
      const userid = getUserId(req);
      const status = await getTaskStatus(task_id);
      if (status.success) {
        const s3key = status.data.s3key;
        const data = await getFromS3(s3key);
        if (data.success) {
          const created_at = Date.now();
          await saveSpeech(chapterid, { s3key, userid, created_at });

          // return audio
          res.writeHead(200, {
            "Content-Type": "audio/mpeg",
            "Content-disposition": "inline;filename=chiselaudio.mp3",
            "Content-Length": data.data.length,
          });
          res.end(data.data);
        } else {
          res.status(400).send(data.message).end();
        }
      } else {
        res.status(200).json(status.message).end();
      }
    } catch (e) {
      console.log(e);
      res.status(400).send(e.message).end();
    }
  }
);

app.get("/api/textToSpeechData/:chapterid", requireAdmin, async (req, res) => {
  const { chapterid } = req.params;
  const userid = getUserId(req);
  const data = await getSpeech(chapterid);
  if (data && data.userid === userid) {
    return res.status(200).json(data);
  }

  res.status(403).send("no access").end();
});

app.get("/api/textToSpeech/:s3key", requireAdmin, async (req, res) => {
  const { s3key } = req.params;
  const data = await getFromS3(s3key);
  if (data.success) {
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Content-disposition": "inline;filename=chiselaudio.mp3",
      "Content-Length": data.data.length,
    });
    res.end(data.data);
  } else {
    res.status(400).send(data.message).end();
  }
});

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

app.get(
  "/api/settings/switchToNewPermissions",
  requireLogin,
  async (req, res) => {
    const user = await getUser(req);
    if (!user) {
      console.log("no user");
      res.status(404).end();
    } else {
      console.log({ user });
      user.permissions = {
        openai_api_gpt35: { type: "none" },
        openai_api_gpt4: { type: "none" },
        openai_api_whisper: { type: "none" },
        amazon_polly: { type: "none" },
        amazon_s3: { type: "none" },
      };
      await saveUser(user);
      res.status(200).json({ success: true }).end();
    }
  }
);

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

app.get("/api/getLastEdited", requireLogin, noCache, async (req, res) => {
  const lastEdited = SE.getLastEdited(req.cookies.userid);
  const prettyDate = lastEdited
    ? new Date(lastEdited).toLocaleString()
    : "never";
  console.log("userid", req.cookies.userid, "lastEdited", prettyDate);
  res.status(200).json({ lastEdited });
});

app.get("/api/bookTitles", requireLogin, noCache, async (req, res) => {
  const userid = getUserId(req);
  if (!userid) {
    console.log("no userid");
    res.status(404).end();
  } else {
    const books = await getBookTitles(userid);

    res.status(200).json({ books });
  }
});

app.get("/book/:bookid", requireLogin, checkBookAccess, async (req, res) => {
  const userid = getUserId(req);
  if (isMobile(req)) {
    serveFile("mobile.html", res, userid);
  } else {
    serveFile("library.html", res, userid);
  }
});

app.get(
  "/book/:bookid/:scrollTop",
  requireLogin,
  checkBookAccess,
  async (req, res) => {
    const userid = getUserId(req);
    if (isMobile(req)) {
      serveFile("mobile.html", res, userid);
    } else {
      serveFile("library.html", res, userid);
    }
  }
);

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
  if (suggestions.success) {
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
      if (!embeddings.success) {
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
    const suggestions = await getSuggestions(user, prompt);

    if (suggestions.success) {
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

const port = process.env.PORT || 80;
app.listen(port, () => console.log(`Server running on port ${port}`));

async function getSuggestionsJSON(
  user,
  _prompt,
  max_tokens,
  model,
  num_suggestions,
  schema,
  retries = 3
) {
  const prompt = `Please respond ONLY with valid json that conforms to this schema: ${schema}. Do not include additional text other than the object json as we will parse this object with JSON.parse. If you do not respond with valid json, we will ask you to try again. Prompt: ${_prompt}`;

  const messages = [{ role: "user", content: prompt }];
  let tries = 0;
  let text;
  while (tries < retries) {
    const suggestions = await getSuggestions(
      user,
      "",
      max_tokens,
      model,
      num_suggestions,
      messages
    );
    if (suggestions.success) {
      text = suggestions.data.choices[0].text;
      try {
        const json = JSON.parse(text);
        return success(json);
      } catch (e) {
        console.log(e);
        tries += 1;
        messages.push({
          role: "system",
          content: `JSON.parse error: ${e.message}`,
        });
      }
    } else {
      return suggestions;
      //tries += 1;
    }
  }
  return failure(text);
}

function checkUsage(user) {
  if (!user.permissions.openai_api) {
    return failure("no openai api permissions");
  }
  let month_total = 0;
  month_total += user.usage.openai_api.tokens.month.prompt || 0;
  month_total += user.usage.openai_api.tokens.month.completion || 0;

  if (user.guest && month_total > settings.maxMonthlyGuestTokens) {
    return failure("monthly guest token limit reached");
  } else if (month_total > settings.maxMonthlyTokens) {
    return failure("monthly token limit reached");
  }
  return success();
}

async function updateUsage(user, usage) {
  user.usage.openai_api.tokens.month.prompt += usage.prompt_tokens || 0;
  user.usage.openai_api.tokens.month.completion += usage.completion_tokens || 0;

  user.usage.openai_api.tokens.total.prompt += usage.prompt_tokens || 0;
  user.usage.openai_api.tokens.total.completion += usage.completion_tokens || 0;

  // TODO use real lastHeardFromServer time here
  await saveUser(user);
}

async function getSuggestions(
  user,
  _prompt,
  _max_tokens = 500,
  model = "gpt-3.5-turbo",
  _num_suggestions = 1,
  _messages = null,
  customKey
) {
  if (!customKey && !user.admin) {
    return failure("Please provide your own key to use the AI features.");
    const check = checkUsage(user);
    if (!check.success) {
      return check;
    }
  }

  const prompt = substringTokens(_prompt, settings.maxPromptLength);
  const max_tokens = Math.min(_max_tokens, settings.maxTokens);
  const num_suggestions = Math.min(_num_suggestions, settings.maxSuggestions);

  const openAiModels = ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "curie"];

  const replicateModels = [
    "vicuna-13b",
    "llama-7b",
    "stablelm-tuned-alpha-7b",
    "flan-t5-xl",
  ];

  const huggingfaceModels = ["TheBloke/guanaco-65B-HF", "gpt2"];
  const localAiModels = ["ggml-gpt4all-j"];
  let result;

  for (const index in instantBlocklist) {
    const term = instantBlocklist[index];
    /*  console.log({
      index,
      term,
      prompt,
      promptLower: prompt.toLowerCase(),
      termLower: term.toLowerCase(),
      includes: prompt.toLowerCase().includes(term.toLowerCase()),
    }); */
    if (prompt.toLowerCase().includes(term.toLowerCase())) {
      console.log("failing early, prompt:", prompt);
      return failure("fetch failed");
    }
  }

  if (openAiModels.includes(model)) {
    result = await usingOpenAi(
      user,
      prompt,
      max_tokens,
      model,
      num_suggestions,
      _messages,
      customKey
    );
  } else if (replicateModels.includes(model) && user.admin) {
    result = await usingReplicate(
      user,
      prompt,
      max_tokens,
      model,
      num_suggestions,
      _messages,
      customKey
    );
  } else if (huggingfaceModels.includes(model)) {
    result = await usingHuggingFace(
      user,
      prompt,
      max_tokens,
      model,
      num_suggestions,
      _messages,
      customKey
    );
  } else if (localAiModels.includes(model)) {
    result = await usingLocalAi(
      user,
      prompt,
      max_tokens,
      model,
      num_suggestions,
      _messages,
      customKey
    );
  } else {
    return failure("invalid model");
  }

  console.log({ result });

  if (!result.success) {
    return result;
  } else {
    if (!customKey) {
      await updateUsage(user, result.data.usage);
    }
    return success({ choices: result.data.choices });
  }
}

async function usingReplicate(
  user,
  prompt,
  max_tokens = 500,
  _model = "vicuna-13b",
  num_suggestions = 1,
  _messages = null,
  customKey
) {
  if (!user.admin) {
    return failure("sorry, only admins can use replicate models");
  }
  const models = {
    "vicuna-13b":
      "replicate/vicuna-13b:6282abe6a492de4145d7bb601023762212f9ddbbe78278bd6771c8b3b2f2a13b",
    "llama-7b":
      "replicate/llama-7b:ac808388e2e9d8ed35a5bf2eaa7d83f0ad53f9e3df31a42e4eb0a0c3249b3165",
    "stablelm-tuned-alpha-7b":
      "stability-ai/stablelm-tuned-alpha-7b:c49dae362cbaecd2ceabb5bd34fdb68413c4ff775111fea065d259d577757beb",
    "flan-t5-xl":
      "replicate/flan-t5-xl:7a216605843d87f5426a10d2cc6940485a232336ed04d655ef86b91e020e9210",
  };
  const model = models[_model];

  if (!model) {
    return failure(`invalid model ${_model}`);
  }

  const input = {
    prompt,
  };
  const output = await replicate.run(model, { input });
  console.log(output);
  return success({ choices: [{ text: output.join("") }], usage: 0 });
}

async function usingLocalAi(
  user,
  prompt,
  max_tokens = 500,
  model = "ggml-gpt4all-j",
  num_suggestions = 1,
  _messages = null,
  customKey
) {
  if (!user.admin) {
    return failure("sorry, only admins can use localai models");
  }

  console.log("localai", settings.localAiEndpoint, prompt);
  const input = {
    model,
    prompt,
    temperature: 0.9,
  };
  const body = JSON.stringify(input);
  console.log(body);
  try {
    const output = await fetch(settings.localAiEndpoint, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });
    console.log(output);

    const json = await output.json();

    console.log({ json });

    if (json.error) {
      return failure(json.error.message);
    }

    const choices = json.choices.map((choice) => ({
      text: choice.message.content,
    }));

    return success({ choices, usage: 0 });
  } catch (e) {
    console.log(e);
    return failure(e.message);
  }
}

function sanitize(str) {
  return str
    .split(" ")
    .map((_word) => {
      const word = _word.trim().replaceAll(/[^a-zA-Z0-9]/g, "");
      if (
        blocklist.includes(word.toLowerCase()) ||
        secondaryBlocklist.includes(word.toLowerCase())
      ) {
        return "****";
      } else {
        return _word;
      }
    })
    .join(" ");
}

async function getEmbeddings(user, _text) {
  // TODO make other AI parts work with custom key.
  if (!user.admin) {
    return failure("Embeddings currently disabled.");
  }
  /* const check = checkUsage(user);
  if (!check.success) {
    return check;
  } */

  const input = substringTokens(_text, settings.maxPromptLength);

  const endpoint = "https://api.openai.com/v1/embeddings";
  const reqBody = {
    input,
    model: "text-embedding-ada-002",
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.openAiApiKey}`,
    },
    body: JSON.stringify(reqBody),
  });
  const json = await res.json();
  console.log({ json });
  if (json.error) {
    return failure(json.error.message);
  }
  await updateUsage(user, json.usage);

  if (json.data) {
    const embeddings = json.data[0].embedding;
    return success(embeddings);
  }
  return failure("no data for embeddings");
}
async function usingHuggingFace(
  user,
  prompt,
  max_tokens = 500,
  _model = "vicuna-13b",
  num_suggestions = 1,
  _messages = null,
  customKey
) {
  if (!user.admin) {
    return failure("sorry, only admins can use huggingface models");
  }
  /*   const models = {
    "vicuna-13b":
      "replicate/vicuna-13b:6282abe6a492de4145d7bb601023762212f9ddbbe78278bd6771c8b3b2f2a13b",
    "llama-7b":
      "replicate/llama-7b:ac808388e2e9d8ed35a5bf2eaa7d83f0ad53f9e3df31a42e4eb0a0c3249b3165",
    "stablelm-tuned-alpha-7b":
      "stability-ai/stablelm-tuned-alpha-7b:c49dae362cbaecd2ceabb5bd34fdb68413c4ff775111fea065d259d577757beb",
    "flan-t5-xl":
      "replicate/flan-t5-xl:7a216605843d87f5426a10d2cc6940485a232336ed04d655ef86b91e020e9210",
  };
 */ const model = "gpt2";

  if (!model) {
    return failure(`invalid model ${_model}`);
  }

  const input = {
    prompt,
  };

  const inference = new HfInference(settings.huggingFaceApiKey);

  const output = await inference.textGeneration({
    model,
    inputs: prompt,
  });

  console.log(output);
  return success({ choices: [{ text: output.generated_text }], usage: 0 });
}

async function usingOpenAi(
  user,
  _prompt,
  max_tokens = 500,
  model = "gpt-3.5-turbo",
  num_suggestions = 1,
  _messages = [],
  customKey
) {
  const chatModels = ["gpt-3.5-turbo", "gpt-3.5-turbo-16k"];
  let endpoint = "https://api.openai.com/v1/completions";

  const prompt = sanitize(_prompt);
  console.log({ prompt });
  let reqBody = {
    prompt,
    max_tokens,
    model,
    n: num_suggestions,
  };
  if (chatModels.includes(model)) {
    endpoint = "https://api.openai.com/v1/chat/completions";

    let messages = _messages;
    if (messages === null) messages = [];
    messages.push({ role: "user", content: prompt });

    reqBody = {
      messages,
      max_tokens,
      model,
      n: num_suggestions,
    };
  }

  console.log(JSON.stringify(reqBody));
  const bearerKey = customKey || settings.openAiApiKey;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerKey}`,
    },
    body: JSON.stringify(reqBody),
  });
  const json = await res.json();

  console.log({ json });

  if (json.error) {
    return failure(json.error.message);
  }

  let choices;
  if (chatModels.includes(model)) {
    choices = json.choices.map((choice) => ({
      text: choice.message.content,
    }));
  } else {
    choices = json.choices.map((choice) => ({ text: choice.text }));
  }
  return success({ choices, usage: json.usage });
}

import { success, failure } from "../utils.js";
import { checkForStaleUpdate } from "../serverUtils.js";
import _ from "lodash";
import { nanoid } from "nanoid";
import { getFirestore } from "firebase-admin/firestore";
import * as Diff from "diff";
import admin, { ServiceAccount } from "firebase-admin";
import settings from "../../config/settings.js";
import serviceAccountKey from "../../config/serviceAccountKey.json" assert { type: "json" };
import {
  Book,
  Chapter,
  Commit,
  History,
  MarkdownBlock,
} from "../../../src/Types.js";
import { Result, SpeechData } from "../types.js";
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey as ServiceAccount),
  });
} catch (e) {
  console.log(e);
}
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

export const saveBook = async (book: Book, lastHeardFromServer: number) => {
  if (!book) {
    console.log("no book to save");
    return failure("No book to save");
  }

  const docRef = db.collection("books").doc(book.bookid);
  return await checkForStaleUpdate(
    "book",
    lastHeardFromServer,
    docRef,
    async () => {
      const created_at = Date.now();
      try {
        book.created_at = created_at;

        // Not sure if this is a good idea, since lastHeardFromServer is something I'm using on the frontend only. But adding it just in case, because I compare lastHeardFromServer and created_at timestamps in checkForStaleUpdate, and would like them to be the same value consistently.
        book.lastHeardFromServer = created_at;

        if (book.chapterOrder) {
          book.chapterOrder = _.uniq(book.chapterOrder);
        }

        await docRef.set(book);
      } catch (error) {
        console.error("Error syncing book to Firestore:", error);
        return failure("Error saving book");
      }
      return success({ lastHeardFromServer: created_at });
    }
  );
};

export const getBook = async (bookid: string): Promise<Book | null> => {
  const bookRef = db.collection("books").doc(bookid);

  const [bookObj, chapters] = await Promise.all([
    bookRef.get(),
    getChaptersForBook(bookid),
  ]);

  if (!bookObj.exists) {
    return null;
  }

  const book = bookObj.data() as Book;
  book.chapters = chapters;
  return book;
};

export const getBookToCheckAccess = async (
  bookid: string
): Promise<Book | null> => {
  const bookRef = db.collection("books").doc(bookid);
  const bookObj = await bookRef.get();
  if (!bookObj.exists) {
    return null;
  }
  const book = bookObj.data() as Book;
  return book;
};

export const getChaptersForBook = async (
  bookid: string
): Promise<Chapter[]> => {
  const chapterRef = db.collection("chapters").where("bookid", "==", bookid);

  const chapters = await chapterRef.get();
  if (chapters.empty) {
    console.log("No chapters found for this book.");
    return [];
  }
  const allChapters = [];
  chapters.forEach((chapter) => {
    const chapterData = chapter.data();
    allChapters.push(chapterData);
  });
  return allChapters;
};

export const deleteBook = async (
  bookid: string,
  lastHeardFromServer: number
) => {
  console.log("deleting book >>", bookid);
  const docRef = db.collection("books").doc(bookid);
  return await checkForStaleUpdate(
    "book",
    lastHeardFromServer,
    docRef,
    async () => {
      const chapters = await db
        .collection("chapters")
        .where("bookid", "==", bookid)
        .get();

      if (chapters.empty) {
        console.log("No chapters found to delete.");
      } else {
        const batch = db.batch();
        const promises = chapters.docs.map(async (doc) => {
          const chapterDocRef = doc.ref;
          const chapter = await chapterDocRef.get();
          if (chapter.exists) {
            const data = chapter.data();
            const deletedDocRef = db
              .collection("deletedChapters")
              .doc(data.chapterid);
            await deletedDocRef.set(data);
            const historyDocRef = db.collection("history").doc(data.chapterid);
            const historyDoc = await historyDocRef.get();
            if (historyDoc.exists) {
              await historyDocRef.delete();
              console.log("deleted history for chapter", data.chapterid);
            }
            const embeddingsDocRef = db
              .collection("embeddings")
              .doc(data.chapterid);
            const embeddingsDoc = await embeddingsDocRef.get();
            if (embeddingsDoc.exists) {
              await embeddingsDocRef.delete();
              console.log("deleted embeddings for chapter", data.chapterid);
            }
          }

          batch.delete(chapterDocRef);
        });
        await Promise.all(promises);
        await batch.commit();
      }

      const book = await docRef.get();
      if (book.exists) {
        const data = book.data();
        const deletedDocRef = db.collection("deletedBooks").doc(data.bookid);
        await deletedDocRef.set(data);
      }

      await docRef.delete();
      return success({});
    }
  );
};

function asArray(
  snapshot: admin.firestore.QuerySnapshot<admin.firestore.DocumentData>
): any[] {
  const array = [];
  snapshot.forEach((doc) => {
    array.push(doc.data());
  });
  return array;
}

export const getBookTitles = async (
  userid: string
): Promise<{ bookid: string; title: string; tag: string }[]> => {
  const _books = await db
    .collection("books")
    .where("userid", "==", userid)
    .get();

  const books = asArray(_books);
  const bookTitles = books.map((book) => {
    return { bookid: book.bookid, title: book.title, tag: book.tag };
  });
  return bookTitles;
};

export const getBooks = async (userid: string): Promise<Book[]> => {
  const books = await db
    .collection("books")
    .where("userid", "==", userid)
    .get();

  if (books.empty) {
    console.log("No books found.");
    return [];
  }
  const allBooks = [];
  const promises = asArray(books).map(async (book) => {
    const chapters = await getChaptersForBook(book.bookid);

    book.chapters = chapters;
    if (book.chapterTitles) {
      book.chapterOrder = book.chapterTitles.map((c) => c.chapterid);
      delete book.chapterTitles;
    }
    const oldLength = book.chapterOrder.length;
    book.chapterOrder = _.uniq(book.chapterOrder);
    if (oldLength !== book.chapterOrder.length) {
      console.log("duplicate chapters found for book", book.bookid, book.title);
    }
    allBooks.push(book);
  });
  await Promise.all(promises);

  const compost = allBooks.find((book) => book.tag === "compost");
  if (!compost) {
    console.log("no compost book");
    const compostBook = makeNewBook({
      userid,
      tag: "compost",
      title: "Compost Heap",
    });

    const compostText =
      "This is a place to store all your random ideas, thoughts, and notes. Like a compost heap: https://egonschiele.github.io/chisel-docs/docs/advanced-features/compost/";
    const compostTitle = "Welcome to your compost heap!";
    const compostChapter = makeNewChapter(
      compostText,
      compostTitle,
      compostBook.bookid
    );
    await saveChapter(compostChapter, null);
    await saveBook(compostBook, null);

    compostBook.chapters = [compostChapter];
    compostBook.chapterOrder = [compostChapter.chapterid];

    allBooks.push(compostBook);
  }
  return allBooks;
};

export const saveEmbeddings = async (chapterid, data) => {
  const docRef = db.collection("embeddings").doc(chapterid);
  try {
    await docRef.set(data);
  } catch (error) {
    console.error("Error syncing embeddings to Firestore:", error);
    return failure("Error saving embeddings");
  }
  return success({ created_at: data.created_at });
};

export const getEmbeddingsForChapter = async (chapterid) => {
  const docRef = db.collection("embeddings").doc(chapterid);
  try {
    const embeddings = await docRef.get();
    if (embeddings.exists) {
      return embeddings.data();
    }
    return null;
  } catch (error) {
    return null;
  }
};

export const saveChapter = async (
  chapter: Chapter,
  lastHeardFromServer: number
): Promise<Result> => {
  if (!chapter) {
    return failure("no chapter to save");
  }

  if (
    settings.limits.chapterLength > 0 &&
    chapter.text &&
    chapter.text.length >= settings.limits.chapterLength
  ) {
    return failure(
      `Chapter is too long. Limit: ${settings.limits.chapterLength}, your chapter: ${chapter.text.length}`
    );
  }

  const docRef = db.collection("chapters").doc(chapter.chapterid);
  return await checkForStaleUpdate(
    "chapter",
    chapter.lastHeardFromServer,
    docRef,
    async () => {
      try {
        chapter.created_at = Date.now();

        await docRef.set(chapter);
      } catch (error) {
        console.error("Error syncing chapter to Firestore:", error);
        return failure("Error saving chapter");
      }
      return success({});
    }
  );
};

export const getChapter = async (
  chapterid: string
): Promise<Chapter | null> => {
  const docRef = db.collection("chapters").doc(chapterid);
  const chapter = await docRef.get();
  if (!chapter.exists) {
    return null;
  }
  const data = chapter.data() as Chapter;
  if (data.embeddings) {
    delete data.embeddings;
    data.embeddingsLastCalculatedAt = null;
  }
  return data;
};

export const deleteChapter = async (
  chapterid: string,
  bookid: string,
  lastHeardFromServer: number
) => {
  const docRef = db.collection("chapters").doc(chapterid);

  return await checkForStaleUpdate(
    "chapter",
    lastHeardFromServer,
    docRef,
    async () => {
      // soft delete
      const chapter = await docRef.get();
      if (chapter.exists) {
        const data = chapter.data();
        const deletedDocRef = db
          .collection("deletedChapters")
          .doc(data.chapterid);
        await deletedDocRef.set(data);
      }

      // delete
      await docRef.delete();

      // remove from chapter order
      const book = await getBook(bookid);
      if (!book) {
        console.log("no book to update");
        return failure("no book to update");
      }
      if (book.chapterOrder) {
        book.chapterOrder = book.chapterOrder.filter(
          (_chapterid) => _chapterid !== chapterid
        );
      }
      return await saveBook(book, lastHeardFromServer);
    }
  );
};

export const getHistory = async (chapterid: string): Promise<History> => {
  const docRef = db.collection("history").doc(chapterid);
  const bookObj = await docRef.get();
  if (!bookObj.exists) {
    return [];
  }
  return bookObj.data().history;
};

export const editCommitMessage = async (
  chapterid: string,
  message: string,
  index: number
): Promise<Result> => {
  let docRef = db.collection("history").doc(chapterid);
  const bookObj = await docRef.get();

  if (!bookObj.exists) {
    return failure(`no history to edit for chapter ${chapterid}`);
  }
  const { history } = bookObj.data();
  console.log({ index, history }, history.length, history[index]);
  if (typeof history[index] === "string") {
    const patch = history[index];
    history[index] = {
      id: nanoid(),
      message,
      timestamp: Date.now(),
      patch,
    };
  } else {
    history[index].message = message;
  }

  docRef = db.collection("history").doc(chapterid);
  await docRef.set({ history });
  return success();
};

export const saveToHistory = async (
  chapterid: string,
  commitData: Commit
): Promise<Result> => {
  let docRef = db.collection("history").doc(chapterid);
  const bookObj = await docRef.get();

  if (!bookObj.exists) {
    const history = [commitData];
    const docRef = db.collection("history").doc(chapterid);
    await docRef.set({ history });
    return success();
  }
  const data = bookObj.data();
  const history: History = data.history;

  if (
    settings.limits.historyLength > 0 &&
    history.length >= settings.limits.historyLength
  ) {
    return failure(
      `History limit reached: ${settings.limits.historyLength}, ${chapterid}`
    );
  }

  const { old, noChange } = checkForChangeInHistory(history, commitData.patch);
  if (noChange) {
    console.log("no change");
    return success();
  }

  // we've sent some text, use that to generate a diff from what's in the history
  const patch = Diff.createPatch(chapterid, old, commitData.patch, "-", "-");
  history.push({ ...commitData, patch });
  docRef = db.collection("history").doc(chapterid);
  await docRef.set({ history });
  return success();
};

function getPatch(data: string | Commit): string {
  if (typeof data === "string") return data;
  return data.patch;
}

function checkForChangeInHistory(history: History, newPatch: string) {
  let old = getPatch(history[0]);
  history.slice(1).forEach((patch) => {
    old = Diff.applyPatch(old, getPatch(patch));
  });

  // const old = history[history.length - 1];
  console.log("old", old);
  const noChange = old.trim() === newPatch.trim();
  return { old, noChange };
}

export function makeNewBook(data = {}): Book {
  const bookid = nanoid();
  const book: Book = {
    bookid,
    title: "Untitled",
    author: "Unknown",
    chapters: [],
    chapterOrder: [],
    columnHeadings: [],
    rowHeadings: [],
    synopsis: "",
    characters: [],
    genre: "",
    style: "",
    userid: "",
    design: {},
    favorite: false,
    ...data,
  };
  return book;
}

export function markdownBlock(text: string): MarkdownBlock {
  return { type: "markdown", open: true, id: nanoid(), text, reference: false };
}

export function makeNewChapter(
  text: string,
  title: string,
  bookid: string,
  data = {}
): Chapter {
  const texts = text.split("---").map((t) => markdownBlock(t.trim()));

  const chapterid = nanoid();
  const chapter = {
    chapterid,
    title,
    bookid,
    text: texts,
    pos: { x: 0, y: 0 },
    suggestions: [],
    favorite: false,
    ...data,
  };
  return chapter;
}

export const deleteBooks = async (userid: string) => {
  console.log("deleting books for user", userid);

  const books = await db
    .collection("books")
    .where("userid", "==", userid)
    .get();

  if (books.empty) {
    console.log("No books found to delete.");
  } else {
    const allbooks = [];
    books.forEach((book) => {
      const bookData = book.data();
      allbooks.push(bookData);
    });
    console.log("deleting books", allbooks);
    allbooks.forEach(async (book) => {
      await deleteBook(book.bookid, Date.now());
    });
  }
};

export const saveSpeech = async (chapterid: string, data: SpeechData) => {
  const docRef = db.collection("speech").doc(chapterid);
  try {
    await docRef.set(data);
  } catch (error) {
    console.error("Error syncing embeddings to Firestore:", error);
    return failure("Error saving embeddings");
  }
  return success({ created_at: data.created_at });
};

export const getSpeech = async (
  chapterid: string
): Promise<SpeechData | null> => {
  const docRef = db.collection("speech").doc(chapterid);
  try {
    const speech = await docRef.get();
    if (speech.exists) {
      return speech.data() as SpeechData;
    }
    return null;
  } catch (error) {
    return null;
  }
};

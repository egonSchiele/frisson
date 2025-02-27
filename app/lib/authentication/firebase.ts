import { Request, Response } from "express";
import { checkForStaleUpdate } from "../serverUtils.js";
import { success, failure } from "../utils.js";
import { getFirestore } from "firebase-admin/firestore";
import { nanoid } from "nanoid";

import * as firebaseAuth from "@firebase/auth";
import * as firebaseApp from "firebase/app";
import settings from "../../config/settings.js";
import { stringToHash } from "../utils/crypto.js";
import { Book } from "../../../src/Types.js";
const firebase = firebaseApp.initializeApp(settings.firebaseConfig);
const auth = firebaseAuth.getAuth(firebase);

export const getUserId = (req: Request): string => {
  if (!req.cookies.userid) {
    return null;
  }
  return req.cookies.userid;
};

export const submitLogin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const credentials = await firebaseAuth.signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = credentials.user;
    /* console.log(firebaseUser);
     */
    let user = await getUserWithEmail(email);
    if (!user) {
      user = await createUser(email);
      if (!user) {
        throw new Error("Failed to create user");
      }
    }
    if (!user.approved) {
      throw new Error("User not approved");
    }

    const token = await stringToHash(user.userid);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    res.json({ userid: user.userid, token });
    /*     res.cookie("userid", user.userid, { maxAge });
    res.cookie("token", token, { maxAge });
    res.redirect("/");
 */
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: err.code });
  }
};

export const submitRegister = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const credentials = await firebaseAuth.createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = credentials.user;

    const user = await createUser(email);
    if (!user) {
      throw new Error("Failed to create user");
    }

    if (!user.approved) {
      throw new Error("User not approved");
    }

    const token = await stringToHash(user.userid);
    //const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    res.json({ userid: user.userid, token });
    /*     res.cookie("userid", user.userid, { maxAge });
    res.cookie("token", token, { maxAge });
    res.redirect("/");
 */
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: err.code });
  }
};

const _getUser = async (userid) => {
  let _userid = userid;

  const db = getFirestore();
  const userRef = db.collection("users").doc(_userid);
  const user = await userRef.get();
  if (!user.exists) {
    return null;
  }
  return user.data();
};

export const getUser = async (req: Request) => {
  const userid = getUserId(req);
  if (!userid) {
    console.log("no userid");
    return null;
  }

  const user = await _getUser(userid);
  if (!user) {
    console.log("no user");
    return null;
  }

  if (!user.permissions.openai_api_gpt35) {
    user.permissions = {
      openai_api_gpt35: { type: "none" },
      openai_api_gpt4: { type: "none" },
      openai_api_whisper: { type: "none" },
      amazon_polly: { type: "none" },
      amazon_s3: { type: "none" },
    };
    await saveUser(user, true);
  }

  const defaultSettings = {
    model: "gpt-3.5-turbo",
    max_tokens: 100,
    num_suggestions: 1,
    theme: "default",
    version_control: false,
    prompts: [
      {
        label: "Expand",
        text: "Write another paragraph for this text: {{text}}",
      },
      {
        label: "Contract",
        text: "Make this text shorter without changing its meaning: {{text}}",
      },
      {
        label: "Rewrite",
        text: "Rewrite this text to make it flow better: {{text}}",
      },
      {
        label: "Fix speech-to-text",
        text: "This text was written using text to speech, and it contains some errors. Please fix them: {{text}}",
      },
      {
        label: "Fix passive voice",
        text: "Please change passive voice to active voice in this text: {{text}}",
      },
    ],
  };

  const settings = {
    ...defaultSettings,
    ...user.settings,
  };

  user.settings = settings;
  return user;
};

// if allowSensitiveUpdate is false, only the settings field will be updated
export const saveUser = async (user, allowSensitiveUpdate = false) => {
  console.log("saving user", user);
  if (!user) {
    console.log("no user to save");
    return false;
  }
  if (!user.userid) {
    console.log("no userid given:", user);
    return false;
  }

  const db = getFirestore();
  const docRef = db.collection("users").doc(user.userid);

  const result = await docRef.get();
  let userToSave = null;
  let userInDb = null;
  if (allowSensitiveUpdate) {
    userToSave = user;
  } else {
    if (result.exists) {
      userInDb = result.data();
      userToSave = { ...userInDb, settings: user.settings };
    } else {
      console.log("user does not exist, so must be new");
      userToSave = user;
    }
  }

  if (!userToSave.email || !userToSave.userid) {
    console.log(`refusing to save user with no email or userid`, {
      userToSave,
      userInDb,
      user,
      allowSensitiveUpdate,
    });
    return false;
  }
  return await checkForStaleUpdate(
    "user",
    user.created_at,
    docRef,
    async () => {
      try {
        userToSave.created_at = Date.now();
        await docRef.set(userToSave);
        console.log("Successfully synced user to Firestore");
        return success({ settings: userToSave.settings });
      } catch (error) {
        console.error("Error syncing user to Firestore:", error);
        return failure();
      }
    }
  );
};

const getUserWithEmail = async (email: string) => {
  let _email = email;

  const db = getFirestore();
  const userRef = db.collection("users").where("email", "==", _email);
  const user = await userRef.get();
  if (user.empty) {
    return null;
  }
  const users = [];
  user.forEach((doc) => {
    users.push(doc.data());
  });
  if (users.length > 1) {
    console.log("Multiple users with same email:", _email);
    return null;
  }
  return users[0];
};

const createUser = async (email: string, extraData = {}) => {
  console.log("creating user");
  console.log({ email });
  const userid = nanoid();
  const data = {
    userid,
    email,
    approved: true,
    admin: false,
    permissions: {
      openai_api_gpt35: { type: "none" },
      openai_api_gpt4: { type: "none" },
      openai_api_whisper: { type: "none" },
      amazon_polly: { type: "none" },
      amazon_s3: { type: "none" },
    },
    usage: {
      openai_api: {
        tokens: {
          month: {
            prompt: 0,
            completion: 0,
          },
          total: {
            prompt: 0,
            completion: 0,
          },
        },
      },
    },
    settings: {},
    created_at: Date.now(),
    ...extraData,
  };

  const db = getFirestore();
  const userRef = db.collection("users").doc(userid);

  try {
    await userRef.set(data);
    console.log("Successfully synced user to Firestore");
    return data;
  } catch (error) {
    console.error("Error syncing user to Firestore:", error);
    return null;
  }
};

export const createGuestUser = async () => {
  const email = nanoid() + "@guest.com";
  const user = await createUser(email, {
    guest: true,
  });
  return user;
};

export const loginGuestUser = async (req, res) => {
  const user = await createGuestUser();
  if (!user) {
    console.log("Failed to create guest user");
    res.redirect("/");
    return;
  }
  const token = await stringToHash(user.userid);
  res.cookie("userid", user.userid);
  res.cookie("token", token);
  res.redirect("/");
};

export const getUsers = async () => {
  const db = getFirestore();
  const users = await db.collection("users").get();

  const userMap = {};

  const userData = [];
  const res = users.forEach(async (user) => {
    const data = user.data();
    userData.push(data);
  });
  const withBooks = await Promise.all(
    userData.map(async (user) => {
      const books = await getBooksForUser(user.userid);
      return {
        books,
        email: user.email,
        userid: user.userid,
        usage: user.usage,
      };
    })
  );
  /*   console.log(">>", userMap);
  console.log("2>>", userData);
 */ return withBooks;
};
export const getGuestUsers = async () => {
  const db = getFirestore();
  const users = await db.collection("users").where("guest", "==", true).get();

  const batch = db.batch();
  let count = 0;
  users.docs.forEach((doc) => {
    if (count >= 499) return;
    batch.delete(doc.ref);
    count++;
  });
  await batch.commit();

  const userMap = {};

  const userData = [];
  const res = users.forEach(async (user) => {
    const data = user.data();
    userData.push(data);
    //await deleteBooks(data.userid);
    // await deleteBooks(data.userid);
  });

  /* const withBooks = await Promise.all(
    userData.map(async (user) => {
      const books = await getBooksForUser(user.userid);
      return {
        books,
        email: user.email,
        userid: user.userid,
        usage: user.usage,
      };
    })
  ); */
  /*   console.log(">>", userMap);
  console.log("2>>", userData);
 */ return userData;
};

export const resetMonthlyTokenCounts = async () => {
  const db = getFirestore();
  const users = await db.collection("users").get();

  const userMap = {};

  const userData = [];
  const res = users.forEach(async (user) => {
    const data = user.data();

    data.usage.openai_api.tokens.month.prompt = 0;
    data.usage.openai_api.tokens.month.completion = 0;
    saveUser(data);
  });

  console.log(">>", userData);
};

export const getBooksForUser = async (userid: number): Promise<Book[]> => {
  const db = getFirestore();
  const books = await db
    .collection("books")
    .where("userid", "==", userid)
    .get();
  const arr = [];
  books.forEach((book) => {
    const bookData = book.data();
    arr.push(bookData);
  });
  return arr;
};

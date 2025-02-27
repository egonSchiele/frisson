import sortBy from "lodash/sortBy";
import cloneDeep from "lodash/cloneDeep";

import CryptoJS from "crypto-js";
import React, { useRef, useEffect, useState, SetStateAction } from "react";

import * as fd from "./lib/fetchData";

import { librarySlice } from "./reducers/librarySlice";
import * as t from "./Types";
import { Dispatch, AnyAction } from "@reduxjs/toolkit";
import { nanoid } from "nanoid";

const ENCRYPTION_PREFIX = "^Encrypted!__";
const ENCRYPTION_SEPARATOR = "||";
const ENCRYPTION_VERSION = "v1";

export function useInterval(fn: any, delay: any) {
  const saved = useRef();
  useEffect(() => {
    saved.current = fn;
  }, [fn]);

  useEffect(() => {
    function tick() {
      if (saved && saved.current) {
        // @ts-ignore
        saved.current();
      }
    }
    const interval = setInterval(() => {
      tick();
    }, delay);
    return () => {
      clearInterval(interval);
    };
  }, [delay]);
}

export function localStorageOrDefault(key: string, defaultValue: any) {
  const value = localStorage.getItem(key);
  if (value === null) {
    return defaultValue;
  }
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}

// Hook
export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });
  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };
  return [storedValue, setValue] as const;
}

export function split(text: string) {
  // @ts-ignore
  let parts = text.replaceAll("\n", "\n ").split(" ");
  parts = parts.filter((part: string) => part !== "");
  return parts;
}

export function normalize(word: string) {
  return word
    .toLowerCase()
    .replace(/[^a-z ]/g, "")
    .trim();
}

export function findSubarray(array: any[], subarray: any[]) {
  const subarrayLength = subarray.length;
  for (let i = 0; i < array.length; i++) {
    if (array.slice(i, i + subarrayLength).join(" ") === subarray.join(" ")) {
      return i;
    }
  }
  return -1;
}

export function getCsrfToken() {
  // @ts-ignore
  const token = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute("content");
  return token;
}

export function parseText(text: string): t.TextBlock[] {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      if (!data[0].id) {
        data.forEach((block: t.TextBlock, index: number) => {
          block.id = nanoid();
        });
      }
      return data;
    }
    return [t.markdownBlock(text)];
  } catch (e) {
    return [t.markdownBlock(text)];
  }
}

export function isString(x): boolean {
  return typeof x === "string" || x instanceof String;
}

export function strSplice(
  str: string,
  index: number,
  count: number,
  add = ""
): string {
  return str.slice(0, index) + (add || "") + str.slice(index + count);
}

export function useTraceUpdate(props) {
  const prev = useRef(props);
  useEffect(() => {
    const changedProps = Object.entries(props).reduce((ps, [k, v]) => {
      if (prev.current[k] !== v) {
        ps[k] = [prev.current[k], v];
      }
      return ps;
    }, {});
    if (Object.keys(changedProps).length > 0) {
      console.log("Changed props:", changedProps);
    }
    prev.current = props;
  });
}

export function getChapterText(
  chapter: t.Chapter | null,
  includeHidden = false
) {
  if (!chapter) return "";
  if (includeHidden) {
    return chapter.text.map((t) => t.text).join("\n\n");
  } else {
    return chapter.text
      .filter((t) => !t.hideInExport)
      .map((t) => t.text)
      .join("\n\n");
  }
}

export function textToSaveToHistory(chapter: t.Chapter): string {
  const texts = chapter.text.map((text: t.TextBlock) => {
    if (
      text.type === "plain" ||
      text.type === "markdown" ||
      text.type === "todoList"
    ) {
      const {
        type,
        open,
        reference,
        versions,
        diffWith,
        caption,
        hideInExport,
        blockColor,
      } = text;
      const jsonFrontMatter = JSON.stringify({
        type,
        open,
        reference,
        versions,
        diffWith,
        caption,
        hideInExport,
        blockColor,
      });
      return `${jsonFrontMatter}\n\n${text.text}`;
    } else if (text.type === "image") {
      const {
        type,
        open,
        reference,
        versions,
        diffWith,
        caption,
        hideInExport,
        blockColor,
        display,
      } = text;
      const jsonFrontMatter = JSON.stringify({
        type,
        open,
        reference,
        versions,
        diffWith,
        caption,
        hideInExport,
        blockColor,
        display,
      });
      return `${jsonFrontMatter}\n\n${text.text}`;
    } else if (text.type === "code") {
      const {
        type,
        open,
        reference,
        versions,
        diffWith,
        caption,
        hideInExport,
        blockColor,
        language,
      } = text;
      const jsonFrontMatter = JSON.stringify({
        type,
        open,
        reference,
        versions,
        diffWith,
        caption,
        hideInExport,
        blockColor,
        language,
      });
      return `${jsonFrontMatter}\n\n${text.text}`;
    } else if (text.type === "embeddedText") {
      const { type, open, bookid, chapterid, textindex, caption } = text;
      const jsonFrontMatter = JSON.stringify({
        type,
        open,
        bookid,
        chapterid,
        textindex,
        caption,
      });
      return `${jsonFrontMatter}\n\n${text.text}`;
    }
  });
  return texts.join("\n---\n");
}

export function restoreBlockFromHistory(text: string): t.TextBlock {
  try {
    const lines = text.split("\n");
    const jsonFrontMatter = lines[0];
    const blockText = lines.slice(2).join("\n");
    const frontMatter = JSON.parse(jsonFrontMatter);
    if (frontMatter.type === "plain") {
      return t.plainTextBlockFromData(
        blockText,
        frontMatter.open,
        frontMatter.reference,
        frontMatter.caption,
        frontMatter.versions,
        frontMatter.diffWith,
        frontMatter.hideInExport,
        frontMatter.blockColor
      );
    } else if (frontMatter.type === "code") {
      return t.codeBlockFromData(
        blockText,
        frontMatter.open,
        frontMatter.reference,
        frontMatter.language,
        frontMatter.caption,
        frontMatter.versions,
        frontMatter.diffWith,
        frontMatter.hideInExport,
        frontMatter.blockColor
      );
    } else if (frontMatter.type === "embeddedText") {
      return t.embeddedTextBlockFromData(
        blockText,
        frontMatter.open,
        frontMatter.bookid,
        frontMatter.chapterid,
        frontMatter.textindex,
        frontMatter.caption
      );
    } else if (frontMatter.type === "todoList") {
      return t.todoListBlockFromData(
        blockText,
        frontMatter.open,
        frontMatter.reference,
        frontMatter.caption,
        frontMatter.versions,
        frontMatter.diffWith,
        frontMatter.hideInExport,
        frontMatter.blockColor
      );
    } else if (frontMatter.type === "image") {
      return t.imageBlockFromData(
        blockText,
        frontMatter.open,
        frontMatter.reference,
        frontMatter.caption,
        frontMatter.versions,
        frontMatter.diffWith,
        frontMatter.hideInExport,
        frontMatter.blockColor,
        frontMatter.display
      );
    } else {
      return t.markdownBlockFromData(
        blockText,
        frontMatter.open,
        frontMatter.reference,
        frontMatter.caption,
        frontMatter.versions,
        frontMatter.diffWith,
        frontMatter.hideInExport,
        frontMatter.blockColor
      );
    }
  } catch (e) {
    return t.markdownBlock(text);
  }
}

export function isTruthy(x) {
  return !!x;
}

export function hasVersions(block: t.TextBlock) {
  if (block.type === "embeddedText") return false;
  return block.versions && block.versions.length > 0;
}

export function today(): t.Date {
  const d = new Date();
  return dateToDate(d);
}

export function dateToDate(date: Date): t.Date {
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function uniq(array: any[]): any[] {
  return [...new Set(array)];
}

export async function tryJson(res) {
  try {
    return await res.json();
  } catch (e) {
    return {};
  }
}

export function getFontSizeClass(size: number | null) {
  return {
    16: "fontsize-16",
    18: "fontsize-18",
    20: "fontsize-20",
    22: "fontsize-22",
  }[size || 18];
}

export function isTextishBlock(block: t.TextBlock) {
  // NOT code
  return block.type === "markdown" || block.type === "plain";
}

export function round(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function setCookie(name, value, days) {
  var expires = "";
  if (days) {
    var date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
export function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}
export function eraseCookie(name) {
  document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
}

export function prettySeconds(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds - hours * 3600) / 60);
  const secondsLeft = Math.floor(seconds - hours * 3600 - minutes * 60);
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secondsLeft > 0) parts.push(`${secondsLeft}s`);
  return parts.join(" ");
}

export function prettyDate(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

export function _encryptMessage(message: string, password: string) {
  return CryptoJS.AES.encrypt(message, password).toString();
}

export function _decryptMessage(message: string, password: string) {
  var bytes = CryptoJS.AES.decrypt(message, password);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return decrypted;
}

export function encryptMessage(message: string, password: string) {
  if (isEncrypted(message)) {
    console.warn("message is already encrypted", message);
    return message;
  }
  const encrypted = _encryptMessage(message, password);
  const components = [
    ENCRYPTION_PREFIX,
    Date.now(),
    ENCRYPTION_VERSION,
    encrypted,
  ];
  return components.join(ENCRYPTION_SEPARATOR);
}
export function isEncrypted(message: string) {
  return message.startsWith(ENCRYPTION_PREFIX);
}

export function decryptMessage(
  message: string,
  password: string
): t.DecryptedMessage {
  if (!isEncrypted(message)) {
    return {
      message,
      created_at: null,
    };
  }
  if (password === null) {
    console.warn(
      "message is encrypted but password was null. Function will throw an error."
    );
    return {
      message,
      created_at: null,
    };
  }
  const components = message.split(ENCRYPTION_SEPARATOR);
  const encrypted = components.slice(3).join(ENCRYPTION_SEPARATOR);
  const created_at = parseInt(components[1]);
  return {
    message: _decryptMessage(encrypted, password),
    created_at,
  };
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function isObject(value) {
  var type = typeof value;
  return value != null && (type == "object" || type == "function");
}

export function traverse(someVal, func, someKey = null) {
  if (isObject(someVal)) {
    const obj = cloneDeep(someVal);
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const result = traverse(value, func, key);
        obj[key] = result;
      }
    }
    return obj;
  } else if (Array.isArray(someVal)) {
    let arr = [...someVal];
    arr = arr.map((item, i) => traverse(item, func, i));
    return arr;
  } else {
    return func(someKey, someVal);
  }
}

export function encryptObject(obj, password) {
  const exclude = [
    "id",
    "chapterid",
    "bookid",
    "userid",
    "tag",
    "encryptionPasswordHint",
  ];

  return traverse(obj, (key, value) => {
    if (exclude.includes(key)) return value;
    if (typeof value !== "string") return value;
    return encryptMessage(value, password);
  });
}

export function decryptObject(obj, password) {
  return traverse(obj, (key, value) => {
    if (typeof value !== "string") return value;
    return decryptMessage(value, password).message;
  });
}

export function isObjectEncrypted(obj) {
  let _isEncrypted = false;
  traverse(obj, (key, value) => {
    if (typeof value !== "string") return false;
    if (isEncrypted(value)) {
      _isEncrypted = true;
    }
  });
  return _isEncrypted;
}

export function getTags(str: string | null): string[] {
  if (!str) return [];
  return str.split(/,\s?/g).filter((x) => x !== "");
}

export function toMarkdown(block: t.TextBlock) {
  if (block.type === "markdown") {
    return block.text;
  } else if (block.type === "code") {
    return "```" + block.language + "\n" + block.text + "\n```";
  } else if (block.type === "plain") {
    return block.text.replaceAll("\n", "\n\n");
  } else {
    return block.text;
  }
}

export function wordCount(chapter: t.Chapter, showHidden = false): number {
  const blocks = showHidden
    ? chapter.text
    : chapter.text.filter((b) => !b.hideInExport);
  const count = blocks
    .map((b) => split(b.text).length)
    .reduce((a, b) => a + b, 0);
  return count;
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function uncapitalize(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

export function getBlockBorderColor(color: t.BlockColor): string {
  const blockColorBorders = {
    red: "border-red-400",
    green: "border-green-600",
    blue: "border-blue-600",
    yellow: "border-yellow-600",
    none: "",
  };
  return blockColorBorders[color];
}

export function pluralize(num: number, word: string): string {
  if (num === 1) return `${num} ${word}`;
  return `${num} ${word}s`;
}

export function getStringContext(
  str: string,
  substring: string,
  window: number
): string {
  const index = str.toLowerCase().indexOf(substring.toLowerCase());
  const start = Math.max(0, index - window);
  const end = Math.min(str.length, index + substring.length + window);
  return str.substring(start, end);
}

export function sortChapters(chapters: t.Chapter[], sortType: t.SortType) {
  if (sortType === "alphabetical") {
    return sortBy(chapters, ["title"]);
  } else if (sortType === "recentlyModified") {
    return sortBy(chapters, ["created_at"]).reverse();
  } else if (sortType === "leastRecentlyModified") {
    return sortBy(chapters, ["created_at"]);
  } else if (sortType === "shortestToLongest") {
    return sortBy(chapters, [wordCount]);
  } else if (sortType === "longestToShortest") {
    return sortBy(chapters, [wordCount]).reverse();
  }
  return chapters;
}

export function hasPermission(
  settings: t.UserSettings,
  permissionName: t.PermissionName
) {
  if (!settings) return false;
  if (settings.admin) return true;
  if (!settings.permissions) return false;
  const permission: t.Permission = settings.permissions[permissionName];
  if (!permission) return false;
  if (permission.type === "none") return false;
  if (permission.type === "unlimited") return true;
  if (permission.type === "limited" && permission.limit && permission.limit > 0)
    return true;
  return false;
}

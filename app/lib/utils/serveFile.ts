import { nanoid } from "nanoid";
import path from "path";
import fs from "fs";
import handlebars from "handlebars";
import * as SE from "../storage/storageEngine.js";

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
export function serveFile(filename, res, userid) {
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
  const rendered = render(path.resolve(`./dist/pages/${filename}`), {
    csrfToken: token,
    lastEdited,
  });
  res.send(rendered).end();
}

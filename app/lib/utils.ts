import blocklist from "../blocklists/blocklist.js";
import secondaryBlocklist from "../blocklists/secondaryBlocklist.js";
import { Request, Response } from "express";
import browser from "browser-detect";
import util from "util";
import fs from "fs";
import { exec, execSync } from "child_process";
import { FailureResult, SuccessResult } from "./types.js";

export function isMobile(req: Request) {
  return browser(req.headers["user-agent"]).mobile;
}

export const writeFileAwait = util.promisify(fs.writeFile);
const execAwait = util.promisify(exec);

export async function run(cmd: string): Promise<string> {
  console.log(`$ ${cmd}`);
  const resp = await execAwait(cmd);

  // @ts-ignore
  return resp.stdout?.toString("UTF8");
}

export async function getAudioDuration(filename: string): Promise<number> {
  const resp = await run(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${filename}`
  );

  return parseFloat(resp) || 0;
}

export function success(data: any = {}): SuccessResult {
  return { success: true, data };
}

export function failure(message: string): FailureResult {
  return { success: false, message };
}

export function sanitize(str) {
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

export function stripPrefix(str: string, prefix: string) {
  if (str.startsWith(prefix)) {
    return str.slice(prefix.length);
  }
  return str;
}

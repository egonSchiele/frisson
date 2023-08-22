import settings from "../../config/settings.js";
export async function stringToHash(str) {
  const encoder = new TextEncoder();
  const salt = settings.tokenSalt;
  const data = encoder.encode(str + salt);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

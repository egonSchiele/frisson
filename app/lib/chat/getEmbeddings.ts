import settings from "../../config/settings.js";
import { substringTokens } from "../serverUtils.js";
import { failure, success } from "../utils.js";
import { updateUsage } from "./updateUsage.js";

export async function getEmbeddings(user, _text) {
  // TODO make other AI parts work with custom key.
  if (!user.admin) {
    return failure("Embeddings currently disabled.");
  }
  /* const check = checkUsage(user);
  if (!check.success === true) {
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
  // TODO: call updatePermissionLimit here too
  await updateUsage(user, json.usage);

  if (json.data) {
    const embeddings = json.data[0].embedding;
    return success(embeddings);
  }
  return failure("no data for embeddings");
}

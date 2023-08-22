import settings from "../../../config/settings.js";
import { failure, sanitize, success } from "../../utils.js";

export async function usingOpenAi(
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
      // @ts-ignore
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

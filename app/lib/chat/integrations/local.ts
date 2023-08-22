import settings from "../../../config/settings.js";
import { failure, sanitize, success } from "../../utils.js";

export async function usingLocalAi(
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

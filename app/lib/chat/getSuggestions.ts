import instantBlocklist from "../../blocklists/instantBlocklist.js";
import settings from "../../config/settings.js";
import { saveUser } from "../authentication/firebase.js";
import {
  substringTokens,
  hasPermission,
  updatePermissionLimit,
} from "../serverUtils.js";
import { failure, success } from "../utils.js";
import { usingOpenAi } from "./integrations/openai.js";
import { usingReplicate } from "./integrations/replicate.js";
import { usingLocalAi } from "./integrations/local.js";
import { usingHuggingFace } from "./integrations/huggingFace.js";
import { updateUsage } from "./updateUsage.js";

export async function getSuggestions(
  user,
  _prompt,
  _max_tokens = 500,
  model = "gpt-3.5-turbo",
  _num_suggestions = 1,
  _messages = null,
  customKey
) {
  const prompt = substringTokens(_prompt, settings.maxPromptLength);

  if (!customKey && !user.admin) {
    const permissionCheck = hasPermission(
      user,
      "openai_api_gpt35",
      prompt.length
    );
    if (!permissionCheck.success === true) {
      console.log("no chatgpt permission");
      return permissionCheck;
    }
  }

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
  } else if (huggingfaceModels.includes(model) && user.admin) {
    result = await usingHuggingFace(
      user,
      prompt,
      max_tokens,
      model,
      num_suggestions,
      _messages,
      customKey
    );
  } else if (localAiModels.includes(model) && user.admin) {
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

  if (!result.success === true) {
    return result;
  } else {
    if (!customKey) {
      await updateUsage(user, result.data.usage);
      const tokensUsed =
        (result.data.usage.prompt_tokens || 0) +
        (result.data.usage.completion_tokens || 0);
      const updateLimit = await updatePermissionLimit(
        user,
        saveUser,
        "openai_api_gpt35",
        tokensUsed
      );
      if (!updateLimit.success === true) {
        return updateLimit;
      }
    }
    return success({ choices: result.data.choices });
  }
}

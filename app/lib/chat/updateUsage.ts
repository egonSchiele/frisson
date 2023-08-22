import { saveUser } from "../authentication/firebase.js";

export async function updateUsage(user, usage) {
  if (!user || !user.usage) {
    console.log("no user or user.usage in updateUsage", { user });
    return;
  }
  user.usage.openai_api.tokens.month.prompt += usage.prompt_tokens || 0;
  user.usage.openai_api.tokens.month.completion += usage.completion_tokens || 0;

  user.usage.openai_api.tokens.total.prompt += usage.prompt_tokens || 0;
  user.usage.openai_api.tokens.total.completion += usage.completion_tokens || 0;

  // TODO use real lastHeardFromServer time here
  await saveUser(user);
}

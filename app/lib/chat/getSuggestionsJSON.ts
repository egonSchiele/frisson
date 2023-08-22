import { failure, success } from "../utils.js";
import { getSuggestions } from "./getSuggestions.js";

export async function getSuggestionsJSON(
  user,
  _prompt,
  max_tokens,
  model,
  num_suggestions,
  schema,
  retries = 3
) {
  const prompt = `Please respond ONLY with valid json that conforms to this schema: ${schema}. Do not include additional text other than the object json as we will parse this object with JSON.parse. If you do not respond with valid json, we will ask you to try again. Prompt: ${_prompt}`;

  const messages = [{ role: "user", content: prompt }];
  let tries = 0;
  let text;
  while (tries < retries) {
    const suggestions = await getSuggestions(
      user,
      "",
      max_tokens,
      model,
      num_suggestions,
      messages,
      null
    );
    if (suggestions.success === true) {
      text = suggestions.data.choices[0].text;
      try {
        const json = JSON.parse(text);
        return success(json);
      } catch (e) {
        console.log(e);
        tries += 1;
        messages.push({
          role: "system",
          content: `JSON.parse error: ${e.message}`,
        });
      }
    } else {
      return suggestions;
      //tries += 1;
    }
  }
  return failure(text);
}

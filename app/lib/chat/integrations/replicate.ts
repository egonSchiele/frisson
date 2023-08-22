import Replicate from "replicate";

import settings from "../../../config/settings.js";
import { failure, success } from "../../utils.js";

const replicate = new Replicate({
  auth: settings.replicateApiKey,
});

export async function usingReplicate(
  user,
  prompt,
  max_tokens = 500,
  _model = "vicuna-13b",
  num_suggestions = 1,
  _messages = null,
  customKey
) {
  if (!user.admin) {
    return failure("sorry, only admins can use replicate models");
  }
  const models = {
    "vicuna-13b":
      "replicate/vicuna-13b:6282abe6a492de4145d7bb601023762212f9ddbbe78278bd6771c8b3b2f2a13b",
    "llama-7b":
      "replicate/llama-7b:ac808388e2e9d8ed35a5bf2eaa7d83f0ad53f9e3df31a42e4eb0a0c3249b3165",
    "stablelm-tuned-alpha-7b":
      "stability-ai/stablelm-tuned-alpha-7b:c49dae362cbaecd2ceabb5bd34fdb68413c4ff775111fea065d259d577757beb",
    "flan-t5-xl":
      "replicate/flan-t5-xl:7a216605843d87f5426a10d2cc6940485a232336ed04d655ef86b91e020e9210",
  };
  const model = models[_model];

  if (!model) {
    return failure(`invalid model ${_model}`);
  }

  const input = {
    prompt,
  };
  const _output = await replicate.run(model, { input });
  const output = _output as unknown as string[];
  console.log(output);
  return success({ choices: [{ text: output.join("") }], usage: 0 });
}

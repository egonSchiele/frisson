import llamaTokenizer from "llama-tokenizer-js";

export function success(data = {}) {
  return { success: true, data };
}

export function failure(message) {
  return { success: false, message };
}

export function toMarkdown(block) {
  if (block.type === "markdown") {
    return block.text;
  } else if (block.type === "code") {
    return "```" + block.language + "\n" + block.text + "\n```";
  } else if (block.type === "plain") {
    return block.text;
    //return block.text.replaceAll("\n", "\n\n");
  }
}

export function chapterToMarkdown(chapter, htmlTags = false) {
  const markdown = chapter.text
    .filter((block) => !block.hideInExport)
    .map((block) => toMarkdown(block))
    .join("\n");
  if (htmlTags) {
    return `<pre>${markdown}</pre>`;
  } else {
    return markdown;
  }
}

export function countTokens(text) {
  return llamaTokenizer.encode(text).length;
}

// return a substring of text that contains tokenCount tokens or less
export function substringTokens(text, tokenCount) {
  if (tokenCount <= 0) return "";
  const tokens = llamaTokenizer.encode(text);
  const sub = tokens.slice(0, tokenCount);
  return llamaTokenizer.decode(sub);
}

export async function checkForStaleUpdate(
  type,
  _lastHeardFromServer,
  docRef,
  func
) {
  const doc = await docRef.get();
  const lastHeardFromServer = parseInt(_lastHeardFromServer);
  const FUDGE_FACTOR = 1000 * 60;

  if (doc.exists) {
    const data = doc.data();
    if (lastHeardFromServer === null) {
      console.log("failure saving", type, "no lastHeardFromServer");
      return failure(
        `Error saving ${type}, no lastHeardFromServer. Please report this bug.`
      );
    }

    console.log(
      "saving",
      type,
      `created_at on ${type}: ${data.created_at}`,
      `lastHeardFromServer: ${lastHeardFromServer}`,
      new Date(data.created_at).toLocaleString(),
      new Date(lastHeardFromServer + FUDGE_FACTOR).toLocaleString()
    );

    if (
      data.created_at &&
      data.created_at > lastHeardFromServer + FUDGE_FACTOR
    ) {
      console.log("failure saving", type, data.created_at, lastHeardFromServer);
      return failure(
        `Could not save, your copy of this ${type} is older than the one in the database. Db: ${new Date(
          data.created_at
        ).toLocaleString()}, your copy: ${new Date(
          lastHeardFromServer
        ).toLocaleString()}. Please refresh to get the latest updates, then try again.`
      );
    }
  }
  return await func();
}

export function prettyDate(timestamp) {
  return new Date(timestamp).toLocaleString();
}

export function hasPermission(user, permissionName, limit = 0) {
  console.log("hasPermission", user, permissionName, limit);
  if (!user) return failure("no user");
  if (user.admin) return success();
  if (!user.permissions) return failure("no permissions found");
  const permission = user.permissions[permissionName];
  if (!permission) return failure("no permission named " + permissionName);
  if (permission.type === "none")
    return failure("no permission for " + permissionName);
  if (permission.type === "unlimited") return success();
  if (permission.type === "limited" && permission.limit) {
    if (permission.limit > limit) return success();
    return failure(
      `limit reached for ${permissionName}. Limit: ${permission.limit}. You requested: ${limit}`
    );
  }
  return failure("unknown permission type " + permissionName);
}

export function updatePermissionLimit(user, permissionName, subtractAmount) {
  if (!user) return failure("no user");
  if (user.admin) return success("admin");
  if (!user.permissions) return failure("no permissions found");
  const permission = user.permissions[permissionName];
  if (!permission) return failure("no permission named " + permissionName);
  if (permission.type === "none")
    return failure("Can't update limit. No permission for " + permissionName);
  if (permission.type === "unlimited") return success("unlimited");
  if (permission.type === "limited" && permission.limit) {
    return success(permission.limit - subtractAmount);
  }
  return failure("unknown permission type " + permissionName);
}

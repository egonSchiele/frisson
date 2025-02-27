import * as t from "../Types";
import { getCookie, getCsrfToken, prettyDate, tryJson } from "../utils";

const FUDGE_FACTOR = 1000 * 60;

export const fetchSettings = async () => {
  const res = await fetch(`/api/settings`, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error fetching settings: ${text}`);
  }
  const data = await res.json();

  if (!data) {
    return t.error("Settings not found");
  }
  return t.success(data);
};

export const checkIfStale = async () => {
  const _lastHeardFromServer = getCookie("lastHeardFromServer");
  if (_lastHeardFromServer === null) {
    return t.error("no lastHeardFromServer found");
  }
  const lastHeardFromServer = parseInt(_lastHeardFromServer);
  const res = await fetch(`/api/lastEdited`, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error fetching last edited: ${text}`);
  }
  const data = await res.json();

  const { lastEdited } = data;

  if (lastEdited === null) {
    return t.success({
      stale: true,
      message:
        "Your content may be stale. We advise a good old fashioned refresh.",
    });
  }

  const lastEditedInt = parseInt(lastEdited);

  if (lastEditedInt > lastHeardFromServer + FUDGE_FACTOR) {
    return t.success({
      stale: true,
      message: `Your content is stale. Please refresh. You last talked to the server at ${prettyDate(
        lastHeardFromServer
      )}, but the server has content from ${prettyDate(lastEditedInt)} now.`,
    });
  }

  return t.success({ stale: false });
};

export const fetchSuggestions = async (_params: t.FetchSuggestionsParams) => {
  const prompt = _params.prompt
    // @ts-ignore
    .replaceAll("{{text}}", _params.replaceParams.text)
    .replaceAll("{{synopsis}}", _params.replaceParams.synopsis);

  const params = {
    ..._params,
    prompt,
  };

  const res = await postWithCsrf(`/api/suggestions`, params);

  if (!res.ok) {
    try {
      const error = await res.json();
      return t.error(error.error);
    } catch (e) {
      return t.error(`Error fetching suggestions: ${e}`);
    }
  }

  const data = await res.json();

  if (!data) {
    return t.error("Suggestions not found");
  }
  if (data.error) {
    return t.error(data.error);
  }
  if (!data.choices) {
    return t.error("No choices returned.");
  }

  return t.success(data.choices);
};

export const newChapter = async (
  bookid: string,
  title: string,
  text: string
) => {
  const res = await postWithCsrf(`/api/chapter`, { bookid, title, text });

  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error creating new chapter: ${text}`);
  }
  const data = await res.json();
  return t.success(data);
};

export async function deleteBook(bookid: string) {
  const res = await deleteWithCsrf(`/api/book/${bookid}`);

  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error deleting book: ${text}`);
  }
  return t.success();
}

export async function deleteChapter(bookid: string, chapterid: string) {
  const res = await deleteWithCsrf(`/api/chapter/${bookid}/${chapterid}`);

  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error deleting book: ${text}`);
  }
  const data = await res.json();
  return t.success(data);
}

export async function newBook() {
  const res = await postWithCsrf(`/api/book`, {});
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error creating new book: ${text}`);
  }
  const book = await res.json();
  return t.success(book);
}

export async function fetchSynonyms(word: string) {
  if (!word) return t.error("No word");

  const res = await fetch(`https://api.datamuse.com/words?ml=${word}&max=20`);
  if (!res.ok) {
    return t.error(`error fetching synonyms: ${res.statusText}`);
  }
  const response = await res.json();

  const synonyms = response.map((item) => item.word);
  return t.success(synonyms);
}

export async function fetchDefinition(word: string) {
  if (!word) return t.error("No word");

  const res = await fetch(`/api/utils/define/${word}`);
  const response = await res.json();
  if (!res.ok) {
    return t.error(response.error);
  }

  return t.success(response);
}

export async function postWithCsrf(url: string, body: any) {
  return await withCsrf("POST", url, body);
}

export async function putWithCsrf(url: string, body: any) {
  return await withCsrf("PUT", url, body);
}

export async function deleteWithCsrf(url: string, body: any = {}) {
  return await withCsrf("DELETE", url, body);
}

export async function withCsrf(method, url: string, body: any) {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...body,
      csrfToken: getCsrfToken(),
      clientSessionId: sessionStorage.getItem("clientSessionId"),
    }),
  });
  return res;
}

export async function uploadBook(chapters) {
  const res = await postWithCsrf(`/api/book/upload`, { chapters });
  if (!res.ok) {
    if (res.status === 413) {
      return t.error(`That's a big file! Keep it under 1MB.`);
    }
    const text = await res.text();
    return t.error(`Error uploading book: ${text}`);
  }
  const book = await res.json();
  return t.success(book);
}

export async function uploadAudio(audioFile) {
  const formData = new FormData();
  formData.append("audioFile", audioFile);
  formData.append("csrfToken", getCsrfToken() as string);

  const res = await fetch("/api/speechToText/upload", {
    method: "POST",
    headers: {
      Accept: "*/*",
      // let browser set multipart boundary by not setting that header
    },

    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error uploading audio: ${text}`);
  }

  const data = await res.json();

  return t.success(data);
}

export async function upload(fileToUpload) {
  const formData = new FormData();
  formData.append("fileToUpload", fileToUpload);
  formData.append("csrfToken", getCsrfToken() as string);

  const res = await fetch("/api/file/upload", {
    method: "POST",
    headers: {
      Accept: "*/*",
      // let browser set multipart boundary by not setting that header
    },

    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error uploading: ${text}`);
  }

  const data = await res.json();

  return t.success(data);
}

export async function getEmbeddings(chapter) {
  const res = await fetch(
    `/api/chapter/${chapter.bookid}/${chapter.chapterid}/embeddings`
  );
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error getting embeddings: ${text}`);
  }
  const embeddings = await res.json();
  return t.success(embeddings);
}

export async function trainOnBook(bookid) {
  const res = await postWithCsrf(`/api/book/${bookid}/embeddings`, {});
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error training: ${text}`);
  }
  const json = await res.json();
  return t.success(json.lastTrainedAt);
}

export async function askQuestion(bookid, question) {
  const res = await postWithCsrf(`/api/book/${bookid}/askQuestion`, {
    question,
  });
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error asking question: ${text}`);
  }
  const json = await res.json();
  return t.success(json);
}

export async function saveToHistory(chapterid: string, data: t.Commit) {
  const res = await postWithCsrf(`/api/history`, { chapterid, ...data });
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error saving to history: ${text}`);
  }
  return t.success();
}

export async function editCommitMessage(
  chapterid: string,
  message: string,
  index: number
) {
  const res = await putWithCsrf(`/api/history/commitMessage`, {
    chapterid,
    message,
    index,
  });
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error editing commit message: ${text}`);
  }
  return t.success();
}

export async function saveChapter(chapter: t.Chapter) {
  const res = await putWithCsrf(`/api/chapter`, {
    chapter,
  });
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error saving chapter: ${text}`);
  }
  const data = await res.json();
  return t.success(data);
}

export async function saveBook(book: t.Book) {
  const res = await putWithCsrf(`/api/book`, {
    book,
  });
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error saving book: ${text}`);
  }
  const data = await res.json();
  return t.success(data);
}

export async function textToSpeechLong(chapterid: string, text: string) {
  const res = await postWithCsrf(`/api/textToSpeech/long`, { chapterid, text });
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error with textToSpeechLong: ${text}`);
  }
  const data = await res.json();
  if (data.success) {
    return t.success(data.task_id);
  }
  return t.error(data.error);
}

export async function textToSpeechShort(chapterid: string, text: string) {
  const res = await postWithCsrf(`/api/textToSpeech/short`, {
    chapterid,
    text,
  });
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error with textToSpeech: ${text}`);
  }
  const data = await res.blob();
  return t.success({ type: "audio", data });
}

export async function getSpeechTaskStatus(chapterid: string, task_id: string) {
  const res = await fetch(`/api/textToSpeech/task/${chapterid}/${task_id}`);
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error getting speech task: ${text}`);
  }
  const contentType = res.headers.get("Content-Type");
  if (contentType === "audio/mpeg") {
    const data = await res.blob();
    return t.success({ type: "audio", data });
  } else {
    const data = await res.json();
    return t.success({ type: "status", status: data.status });
  }
}

export async function getTextToSpeechData(chapterid: string) {
  const res = await fetch(`/api/textToSpeech/data/${chapterid}`);
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error getting speech data: ${text}`);
  }
  const data = await res.json();
  return t.success(data);
}

export async function getTextToSpeechAudio(s3key: string) {
  const res = await fetch(`/api/textToSpeech/file/${s3key}`);
  if (!res.ok) {
    const text = await res.text();
    return t.error(`Error getting speech audio: ${text}`);
  }
  const data = await res.blob();
  return t.success({ type: "audio", data });
}

export function getAudioURL(s3key: string) {
  return `/api/textToSpeech/${s3key}#t=00:00:05`;
}

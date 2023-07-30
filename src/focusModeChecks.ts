import { fillers } from "fillers";
import { hedges } from "hedges";
import range from "lodash/range";
import jargon from "./jargon";
import cliches from "./lib/cliches";
import { findSubarray, normalize, split } from "./utils";

import * as t from "./Types";

type Annotation = {
  type: AnnotationType;
  word?: string;
  alternatives?: string[];
  groupid?: number;
  startIndex?: number;
  length?: number;
};

type AnnotationType = "hedge" | "filler" | "cliche" | "jargon" | "longline";

const clicheTextAsWords: string[][] = cliches.map((fragment) =>
  split(fragment).map(normalize)
);

const jargonTextAsWords = jargon.map((tuple) => {
  const [jargonText, alternative] = tuple;
  return split(jargonText).map(normalize);
});

const jargonTextAlternatives = jargon.map((tuple) => {
  const [jargonText, alternative] = tuple;
  return alternative;
});

function getRangeFromWords(words, { wordIndex, wordLength }) {
  // TODO: this is a bit of a hack, but it works
  const start = words
    .slice(0, wordIndex)
    .reduce((acc, word) => acc + word.length + 1, 0);
  const end = words
    .slice(0, wordIndex + wordLength)
    .reduce((acc, word) => acc + word.length + 1, 0);
  return { index: start, length: end - start - 1 };
}

function findMultiWordAnnotations(
  words: string[],
  badPhrases: string[][],
  name: string,
  className: string
  /*   alternatives = []
   */
): t.FormatData[] {
  let formats: t.FormatData[] = [];
  badPhrases.forEach((badPhrase, i) => {
    const wordIndex = findSubarray(words, badPhrase);
    if (wordIndex !== -1) {
      /*       const ids = range(index, index + badPhrase.length);
       */ /*const annotation: Annotation = {
        type,
        groupid,
        startIndex: index,
        length: badPhrase.length,
      };
       if (alternatives[i]) {
        annotation.alternatives = [alternatives[i]];
      } */
      const range = getRangeFromWords(words, {
        wordIndex,
        wordLength: badPhrase.length,
      });
      formats.push({
        name,
        range,
        format: { class: className },
        content: words.slice(wordIndex, wordIndex + badPhrase.length).join(" "),
      });
    }
  });
  return formats;
}

function findLongLines(lines) {
  let start = 0;
  const formats = [];
  lines.forEach((line) => {
    const lineWords = line.split(" ");
    if (lineWords.length > 20) {
      const range = {
        index: start,
        length: line.length,
      };
      formats.push({
        name: "long line",
        range,
        format: { class: "longline" },
        content: line,
      });
    }
    start += line.length;
  });
  return formats;
}

function highlightWords(words, list, name, className): t.FormatData[] {
  let idx = 0;
  const result = [];
  words.forEach((word) => {
    const normalizedWord = normalize(word);
    const start = idx;
    const end = idx + word.length;
    const toHighlight = list.includes(normalizedWord);

    if (toHighlight) {
      const range = { index: start, length: word.length };
      result.push({ name, range, format: { class: className }, content: word });
    }
    idx = end + 1;
  });
  return result;
}
function clearFormatting(words: string[]): t.FormatData[] {
  let idx = 0;
  return words.map((word) => {
    word = normalize(word);
    const start = idx;
    const end = idx + word.length;
    const range = { index: start, length: word.length };
    idx = end + 1;
    return { name: "clear", range, format: { class: null }, content: word };
  });
}

export default function highlightErrors(text: string): t.FormatData[] {
  const lines = text.split(/[.!?:;\n–] ?/);
  const words = text.split(" ");
  const formats = [
    //...clearFormatting(words),
    ...highlightWords(words, fillers, "filler", "fillers"),
    ...highlightWords(words, hedges, "hedge", "hedges"),
    ...findMultiWordAnnotations(words, clicheTextAsWords, "cliche", "cliches"),
    ...findMultiWordAnnotations(words, jargonTextAsWords, "jargon", "jargon"),
    ...findLongLines(lines),
  ];
  return formats;
}

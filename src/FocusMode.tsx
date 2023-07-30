import { daleChall } from "dale-chall";
import { stemmer } from "stemmer";
import range from "lodash/range";
import { XMarkIcon } from "@heroicons/react/24/outline";
import React, { useEffect, useRef, useState } from "react";
import { hedges } from "hedges";
import NavButton from "./components/NavButton";
import { fillers } from "fillers";
import cliches from "./lib/cliches";
import List from "./components/List";
import { syllable } from "syllable";
import Button from "./components/Button";
import jargon from "./jargon";
import { normalize, findSubarray, split } from "./utils";
import * as fd from "./lib/fetchData";
import { useKeyboardScroll } from "./lib/hooks";
import { librarySlice } from "./reducers/librarySlice";
import { useDispatch } from "react-redux";

type Annotation = {
  type: AnnotationType;
  word?: string;
  alternatives?: string[];
  groupid?: number;
  startIndex?: number;
  length?: number;
};

type AnnotationType = "hedge" | "filler" | "cliche" | "jargon" | "longline";

function FocusList({ words, index, onSynonymClick, onDelete, annotations }) {
  const dispatch = useDispatch();
  const selected = words[index];
  const [synonyms, setSynonyms] = useState([]);
  const fetchSynonyms = async () => {
    if (!selected) return;
    if (selected.length < 3) return;

    const res = await fd.fetchSynonyms(normalize(selected));
    if (res.tag === "error") {
      dispatch(librarySlice.actions.setError("Error fetching synonyms"));
      return;
    }

    setSynonyms(res.payload);
  };

  useEffect(() => {
    fetchSynonyms();
  }, [selected]);

  const items = [];
  if (selected) {
    const syllableCount = syllable(selected);
    const annotationItems = [];
    annotations.forEach((annotation, annotation_index) => {
      if (annotation.type === "cliche") {
        const clicheString = [];
        let _index = annotation.startIndex;
        let i = 0;
        while (i < annotation.length) {
          clicheString.push(words[_index]);
          _index++;
          i++;
        }
        annotationItems.push({
          label: "part of a cliche",
          value: clicheString.join(" "),
        });
      } else if (annotation.type === "jargon") {
        const clicheString = [];
        let _index = annotation.startIndex;
        let i = 0;
        while (i < annotation.length) {
          clicheString.push(words[_index]);
          _index++;
          i++;
        }
        const replacementTuple = jargon.find((tuple) => {
          return normalize(tuple[0]) === normalize(clicheString.join(" "));
        });
        const replacement = replacementTuple ? replacementTuple[1] : "";
        annotationItems.push({
          label: "jargon",
          value: clicheString.join(" "),
          replacement,
        });
      }
    });
    items.push(
      <div className="grid grid-cols-1" key={1}>
        <h1 className="text-4xl font-georgia my-xs py-xs antialiased font-light overflow-hidden break-words">
          {selected}
        </h1>
        <p className="text-md dark:text-white">
          {syllableCount} <span className="dark:text-gray-300">syllables</span>
        </p>
        {synonyms && (
          <div className="grid grid-cols-1">
            <p className="text-md dark:text-white">Synonyms:</p>
            <ul>
              {synonyms.map((synonym, i) => (
                <li
                  key={i}
                  onClick={() => onSynonymClick(synonym)}
                  className="dark:text-gray-300 cursor-pointer max-w-fit h-5"
                >
                  {synonym}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-md">
          {annotationItems.map((item, i) => (
            <div key={i}>
              <p className="text-md uppercase">{item.label}</p>
              <p>{item.value}</p>
              {item.replacement && (
                <p className="text-sm dark:text-gray-300">
                  Suggested replacement: {item.replacement}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-md">
          <Button
            onClick={() => {
              onDelete(index);
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    );
  }
  return (
    <List
      title={selected ? "Info" : "Select a word"}
      items={items}
      /*       rightMenuItem={rightMenuItem}
      leftMenuItem={leftMenuItem}*/
      className="bg-sidebarSecondary dark:bg-dmsidebarSecondary"
    />
  );
}

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

function Word({
  word,
  annotations,
  activeGroups,
  onHover,
  onLeave,
  index,
  onChange,
  isCurrentWord,
  setCurrentWord,
}: {
  word: string;
  annotations: Annotation[];
  activeGroups: number[];
  onHover: any;
  onLeave: any;
  index: number;
  onChange: any;
  isCurrentWord: boolean;
  setCurrentWord: any;
}) {
  const normalized = normalize(word);

  const simpleTags = annotations
    .filter((tag) => !tag.groupid)
    .filter((tag) => tag.type !== "longline")
    .map((tag) => tag.type);
  const tagsWithGroupid = annotations
    .filter((tag) => tag.groupid)
    .filter((tag) => tag.type !== "longline");
  const complexTags = tagsWithGroupid.map((tag) => tag.type);
  const groupids = tagsWithGroupid.map((tag) => tag.groupid);
  const hasLongLine =
    annotations.find((tag) => tag.type === "longline") !== undefined;
  const activeGroupids = groupids.filter((groupid) =>
    activeGroups.includes(groupid)
  );
  let className = "";
  if (isCurrentWord) {
    className = "bg-gray-300 dark:bg-gray-600";
  }
  if (activeGroupids.length > 0) {
    className = "bg-gray-200 dark:bg-green-500";
  }
  if (hasLongLine) {
    className = "border-b-2 border-red-700";
  }

  return (
    <div
      onMouseEnter={() => {
        onHover(groupids);
      }}
      onMouseLeave={() => {
        onLeave();
      }}
      onClick={() => {
        setCurrentWord(index);
      }}
      className={`flex-none max-w-fit cursor-pointer max-h-fit m-0 p-0 mb-xs pr-xs ${className}`}
    >
      {/*   <p className="text-sm font-light antialiased dark:text-gray-300 text-end">
        {syllable(word)}
      </p> */}
      <div className="text-4xl font-georgia font-light antialiased dark:text-white">
        {word}
      </div>
      {/*  <ContentEditable
        className="col-span-9 flex-grow text-md align-text-top"
        value={word}
        onSubmit={(newWord) => {
          onChange(index, newWord);
        }}
      /> */}
      <div className="h-sm text-sm mb-xs font-light antialiased dark:text-gray-300">
        {simpleTags.join(", ")}
        {complexTags.join(", ")}
        {/*         {JSON.stringify(annotations)}
         */}{" "}
      </div>
    </div>
  );
}

function findMultiWordAnnotations(
  words: string[],
  badPhrases: string[][],
  type: AnnotationType,
  alternatives = []
) {
  let groupid = 1;
  let idsAndAnnotations: { ids: number[]; annotation: Annotation }[] = [];
  badPhrases.forEach((badPhrase, i) => {
    const index = findSubarray(words, badPhrase);
    if (index !== -1) {
      const ids = range(index, index + badPhrase.length);
      const annotation: Annotation = {
        type,
        groupid,
        startIndex: index,
        length: badPhrase.length,
      };
      if (alternatives[i]) {
        annotation.alternatives = [alternatives[i]];
      }
      idsAndAnnotations.push({ ids, annotation });
      groupid++;
    }
  });
  return idsAndAnnotations;
}

function findLongLines(lines) {
  let count = 0;
  let idsAndAnnotations: { ids: number[]; annotation: Annotation }[] = [];
  let groupid = 0;
  lines.forEach((line) => {
    const lineWords = split(line);
    if (lineWords.length > 20) {
      const annotation: Annotation = {
        type: "longline",
        groupid,
        startIndex: count,
        length: lineWords.length,
      };
      const ids = range(count, count + lineWords.length);
      idsAndAnnotations.push({ ids, annotation });
      groupid++;
    }
    count += lineWords.length;
  });
  return idsAndAnnotations;
}

function addAnnotations(results, annotations) {
  results.forEach((data) => {
    const { ids, annotation } = data;
    ids.forEach((id) => {
      annotations[id].push(annotation);
    });
  });
}

export default function FocusMode({ text, onClose, onChange }) {
  const [history, setHistory] = useState([text]);
  const mostRecentText = history[history.length - 1];
  const [activeGroups, setActiveGroups] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const words = split(mostRecentText);
  const lines = mostRecentText.split(/\.\s+/);
  const normalizedWords: string[] = words.map(normalize);
  const wordAnnotations: Annotation[][] = [];

  for (let i = 0; i < words.length; i++) {
    wordAnnotations.push([]);
  }

  let results = findMultiWordAnnotations(
    normalizedWords,
    clicheTextAsWords,
    "cliche"
  );

  addAnnotations(results, wordAnnotations);

  results = findMultiWordAnnotations(
    normalizedWords,
    jargonTextAsWords,
    "jargon",
    jargonTextAlternatives
  );

  addAnnotations(results, wordAnnotations);

  results = findLongLines(lines);
  addAnnotations(results, wordAnnotations);

  normalizedWords.forEach((word, i) => {
    if (hedges.includes(word)) {
      wordAnnotations[i].push({ type: "hedge" });
    }
    if (fillers.includes(word)) {
      wordAnnotations[i].push({ type: "filler" });
    }
    /* if (!daleChall.includes(stemmer(word))) {
      wordAnnotations[i].push({ type: "complex" });
    } */
  });

  function replaceWord(index, newWord) {
    const newWords = [...words];
    if (newWord === "") {
      newWords.splice(index, 1);
    } else {
      newWords[index] = newWord;
    }

    const newText = `${newWords.join(" ")}\n`;

    setHistory([...history, newText]);
    setCurrentWord(null);
  }

  useEffect(() => {
    onChange(mostRecentText);
  }, [mostRecentText]);

  function onSynonymClick(synonym) {
    replaceWord(currentWord, synonym);
  }

  function onDelete(index) {
    replaceWord(index, "");
  }

  const handleKeyDown = (event) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      if (currentWord) {
        onDelete(currentWord);
      }
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  const focusDiv = useRef(null);
  useKeyboardScroll(focusDiv);

  const wordComponents = words.map((word: string, i: number) => {
    const annotations = wordAnnotations[i] || [];
    return (
      <Word
        key={i}
        word={word}
        annotations={annotations}
        onHover={setActiveGroups}
        onLeave={() => setActiveGroups([])}
        onChange={replaceWord}
        activeGroups={activeGroups}
        index={i}
        isCurrentWord={currentWord === i}
        setCurrentWord={setCurrentWord}
      />
    );
  });
  return (
    <div className="w-3/4 mx-auto">
      <div className="w-full flex flex-col flex-wrap mt-md">
        <div className="flex-grow" />
        <div className="flex-none">
          <NavButton label="Unsaved" onClick={onClose}>
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </NavButton>
        </div>
      </div>
      {/*  <h1 className="text-4xl font-georgia font-light antialiased dark:text-white">
        {JSON.stringify(activeGroups)}
      </h1> */}
      <div className="w-full flex justify-around">
        <div className="flex-none w-48 sticky top-0">
          <FocusList
            words={words}
            index={currentWord}
            onSynonymClick={onSynonymClick}
            onDelete={onDelete}
            annotations={wordAnnotations[currentWord] || []}
          />
        </div>
        <div className="mt-8 pt-xs">
          <div
            style={{ height: "calc(100vh - 10rem)" }}
            className="overflow-auto mt-5 flex-grow flex max-w-screen-md mx-auto flex-wrap content-start"
            ref={focusDiv}
          >
            {wordComponents}
          </div>
        </div>
      </div>
    </div>
  );
}

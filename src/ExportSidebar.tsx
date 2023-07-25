import React, { useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import LibraryContext from "./LibraryContext";
import * as t from "./Types";
import Button from "./components/Button";
import List from "./components/List";
import {
  getSelectedBook,
  getSelectedChapter,
  getText,
  librarySlice,
} from "./reducers/librarySlice";
import { RootState } from "./store";
import { useColors } from "./lib/hooks";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Square2StackIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import * as fd from "./lib/fetchData";
import Switch from "./components/Switch";
import {
  isTextishBlock,
  prettySeconds,
  toMarkdown,
  useInterval,
  useLocalStorage,
} from "./utils";
import InfoSection from "./components/InfoSection";
import Spinner from "./components/Spinner";
import { set } from "cypress/types/lodash";
import RadioGroup from "./components/RadioGroup";

function CopyAs({ setMessage, className = "" }) {
  const suggestions = useSelector(
    (state: RootState) => state.library.suggestions
  );
  const currentChapter = useSelector(getSelectedChapter);
  const [type, setType] = useLocalStorage("exportSidebar-type", "plain");
  const [includeHidden, setIncludeHidden] = useLocalStorage(
    "exportSidebar-includeHidden",
    false
  );
  const options = [
    { type: "plain", label: "Plain" },
    { type: "markdown", label: "Markdown" },
    { type: "JSON", label: "JSON" },
  ];

  function copy() {
    if (!currentChapter) return;
    const blocks = includeHidden
      ? currentChapter.text
      : currentChapter.text.filter((block) => !block.hideInExport);

    if (type === "plain") {
      const text = blocks.map((block) => block.text).join("\n");
      navigator.clipboard.writeText(text);
    } else if (type === "markdown") {
      const text = blocks.map((block) => toMarkdown(block)).join("\n\n");
      navigator.clipboard.writeText(text);
    } else if (type === "JSON") {
      const chapter = { ...currentChapter, suggestions };
      navigator.clipboard.writeText(JSON.stringify(chapter, null, 2));
    }
  }

  return (
    <div className={`grid grid-cols-1 gap-xs ${className}`}>
      <RadioGroup
        value={type}
        onChange={setType}
        className={"grid grid-cols-1"}
        label="Type"
        options={options}
      />
      {(type === "markdown" || type === "plain") && (
        <Switch
          label="Include Hidden In Export?"
          enabled={includeHidden}
          setEnabled={(enabled) => {
            setIncludeHidden(enabled);
          }}
          divClassName="mt-sm"
        />
      )}
      <Button
        key="copyChapter"
        className="w-full"
        onClick={() => {
          copy();
          setMessage("Copied chapter to clipboard");
        }}
      >
        Copy As {type}
      </Button>
    </div>
  );
}

export default function ExportSidebar() {
  const allBooks = useSelector((state: RootState) => state.library.books);
  const currentBook = useSelector(getSelectedBook);
  const currentChapter = useSelector(getSelectedChapter);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const colors = useColors();
  const [speechTaskID, setSpeechTaskID] = React.useState<string>("");
  const [speechTaskStatus, setSpeechTaskStatus] = React.useState<string>("");
  const [fullChapter, setFullChapter] = React.useState<boolean>(false);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [message, setMessage] = React.useState<string>("");
  if (!currentChapter) return null;

  const items = [];

  if (message) {
    items.push(
      <div className="bg-green-700 p-2 text-white flex rounded-md mb-sm">
        <p className="flex-grow">{message}</p>
        <div
          className="cursor-pointer flex-none"
          onClick={() => setMessage("")}
        >
          <XMarkIcon className="w-5 h-5 my-auto" />
        </div>
      </div>
    );
  }

  items.push(
    <CopyAs setMessage={setMessage} key="copyAs" className="mb-sm" />,
    <Button
      key="copyBook"
      className="w-full mb-sm"
      onClick={() => {
        navigator.clipboard.writeText(JSON.stringify(currentBook, null, 2));
        setMessage("Copied book to clipboard");
      }}
    >
      Copy Book As JSON
    </Button>,
    <Button
      key="copyAllBooks"
      className="w-full mb-sm"
      onClick={() => {
        navigator.clipboard.writeText(JSON.stringify(allBooks, null, 2));
        setMessage("Copied all books to clipboard");
      }}
    >
      Copy All Books As JSON
    </Button>
  );
  const spinner = {
    label: "Loading",
    icon: <Spinner className="w-5 h-5" />,
    onClick: () => {},
  };
  return (
    <List
      title="Export"
      items={items}
      leftMenuItem={loading ? spinner : null}
      /*       rightMenuItem={rightMenuItem}
       */ selector="publishList"
    />
  );
}

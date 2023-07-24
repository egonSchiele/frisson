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
import { isTextishBlock, prettySeconds, useInterval } from "./utils";
import InfoSection from "./components/InfoSection";
import Spinner from "./components/Spinner";
import { set } from "cypress/types/lodash";

export default function ExportSidebar() {
  const state = useSelector((state: RootState) => state.library.editor);
  const currentBook = useSelector(getSelectedBook);
  const index = state.activeTextIndex;
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
      <div className="bg-green-700 p-2 text-white flex">
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
    <Button
      key="copyChapter"
      className="w-full"
      onClick={() => {
        navigator.clipboard.writeText(JSON.stringify(currentChapter));
        setMessage("Copied chapter to clipboard");
      }}
    >
      Copy Chapter
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

import * as fd from "./lib/fetchData";
import * as Diff from "diff";
import range from "lodash/range";
import React, { useState, useEffect, useContext } from "react";
import Button from "./components/Button";
import Input from "./components/Input";
import Select from "./components/Select";
import * as t from "./Types";
import Panel from "./components/Panel";
import { getHtmlDiff } from "./lib/diff";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./store";
import LibraryContext from "./LibraryContext";
import { librarySlice } from "./reducers/librarySlice";
import { nanoid } from "nanoid";
import { prettyDate } from "./utils";
import { useColors } from "./lib/hooks";

const WINDOW = 5;
const MAX_LINES = 10;

function HistoryPanel({
  index,
  patch,
  nextPatch,
  commit,
  onClick,
  editCommitMessage,
}: {
  index: number;
  patch: string;
  nextPatch: string;
  commit: t.Commit;
  onClick: (e: React.MouseEvent, patch: string) => void;
  editCommitMessage: (message: string) => void;
}) {
  const viewMode = useSelector((state: RootState) => state.library.viewMode);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState(commit.message);
  const colors = useColors();
  const fullscreen = viewMode === "fullscreen";
  const title = prettyDate(commit.timestamp) + " --  " + index;
  const lines = commit.patch.split("\n");
  const patchPreview = lines.slice(0, MAX_LINES).join("\n");
  if (!fullscreen) {
    return (
      <div className="grid grid-cols-1">
        <Panel
          title={title}
          // @ts-ignore
          onClick={(e) => {
            e.stopPropagation();
            onClick(e, patch);
          }}
          className="cursor-pointer"
          selector="history-panel"
        >
          {commit.message && (
            <h2
              className={`text-base xl:text-lg mb-sm font-semibold pb-xs border-b-2 border-black`}
            >
              {commit.message}
            </h2>
          )}
          <pre className="text-xs xl:text-sm">{patchPreview}</pre>
          {lines.length > MAX_LINES && (
            <pre className="text-xs xl:text-sm text-gray-400 mt-xs">
              ...{lines.length - MAX_LINES} more lines
            </pre>
          )}
        </Panel>
        {showMessage && (
          <Input
            name="commit-message"
            title="Commit Message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full mt-xs"
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editCommitMessage(message);
                setShowMessage(!showMessage);
              }
            }}
          />
        )}
        {showMessage && (
          <Button
            onClick={() => {
              editCommitMessage(message);
              setShowMessage(!showMessage);
            }}
            className="w-full my-xs"
          >
            Done
          </Button>
        )}
        {!showMessage && (
          <Button
            onClick={() => {
              setShowMessage(true);
            }}
            className="w-full my-xs"
          >
            {message ? "Edit Message" : "Add Message"}
          </Button>
        )}
      </div>
    );
  }
  const changesOnly = patch.length > 10000 || nextPatch.length > 10000;
  const { originalLines, newLines } = getHtmlDiff(
    patch,
    nextPatch,
    changesOnly
  );
  return (
    <Panel
      title={`History [${index}]`}
      // @ts-ignore
      onClick={(e) => {
        e.stopPropagation();
        onClick(e, patch);
      }}
      className="cursor-pointer"
      selector="history-panel"
    >
      <div className="grid grid-cols-2 gap-4 m-md font-mono">
        <div className="p-sm bg-gray-100 dark:bg-gray-700 rounded-md">
          {originalLines}
        </div>
        <div className="p-sm bg-gray-100 dark:bg-gray-700 rounded-md">
          {newLines}
        </div>
      </div>
    </Panel>
  );
}

function getPatch(data: string | t.Commit): string {
  if (typeof data === "string") return data;
  return data.patch;
}

function getCommit(data: string | t.Commit): t.Commit {
  if (typeof data === "string") {
    return {
      id: nanoid(),
      patch: data,
      message: "",
      timestamp: Date.now(),
    };
  }
  return data;
}

function History({ bookid, chapterid, triggerHistoryRerender }) {
  const [history, setHistory] = useState<t.History>([]);
  const [page, setPage] = useState(0);
  const viewMode = useSelector((state: RootState) => state.library.viewMode);
  const fullscreen = viewMode === "fullscreen";
  const dispatch = useDispatch();
  useEffect(() => {
    const func = async () => {
      const res = await fetch(`/api/getHistory/${bookid}/${chapterid}`, {
        credentials: "include",
      });
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      setHistory(data);
    };
    func();
  }, [chapterid, triggerHistoryRerender]);

  const { onTextEditorSave } = useContext(
    LibraryContext
  ) as t.LibraryContextType;

  const applyPatch = (index: number): string => {
    if (index < 0) return "";
    if (!history || !history[index]) return "";
    let old: string = getPatch(history[0]);
    if (index === 0) return old;

    history.slice(1, index + 1).forEach((_patch: string | t.Commit) => {
      const patch = getPatch(_patch);
      const result = Diff.applyPatch(old, patch);
      if (result) old = result;
    });
    return old;
  };

  async function onClick(e, newText) {
    //await onTextEditorSave(state);
    dispatch(
      librarySlice.actions.restoreFromHistory({
        text: newText,
        metaKey: e.metaKey,
      })
    );
    dispatch(librarySlice.actions.setViewMode("default"));
  }

  async function editCommitMessage(message: string, index: number) {
    //await onTextEditorSave(state);
    const result = await fd.editCommitMessage(chapterid, message, index);

    if (result.tag === "error") {
      dispatch(librarySlice.actions.setError(result.message));
    }
  }

  function addToHistory() {
    onTextEditorSave(null, true);
  }

  if (!history || history.length === 0)
    return (
      <div className="grid grid-cols-1 gap-3">
        <Button onClick={addToHistory}>Commit to History</Button>
        <p>No history</p>
      </div>
    );
  const reverseHistory = [...history].reverse();

  if (!fullscreen) {
    return (
      <div className="grid grid-cols-1 gap-3">
        <Button onClick={addToHistory}>Commit to History</Button>
        {reverseHistory.map((patch, i) => (
          <HistoryPanel
            key={i}
            index={i}
            onClick={(e) => onClick(e, applyPatch(history.length - 1 - i))}
            patch={""}
            nextPatch={""}
            commit={getCommit(patch)}
            editCommitMessage={(message) =>
              editCommitMessage(message, history.length - 1 - i)
            }
          />
        ))}
      </div>
    );
  }

  const patches = reverseHistory.map((_, i) =>
    applyPatch(history.length - 1 - i)
  );
  let total = reverseHistory.length;
  let start = page * WINDOW + 1;
  let end = Math.min(start + WINDOW, total + 1);

  /*  const handleKeyDown = async (event) => {
    if (event.key === "ArrowRight") {
      if (end < total) {
        event.preventDefault();
        setPage(page + 1);
      }
    } else if (event.key === "ArrowLeft") {
      if (start !== 0) {
        event.preventDefault();
        setPage(page - 1);
      }
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, start, end, total]); */

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex content-start gap-2">
        <p>
          {start} - {end - 1} of {total}
        </p>
        {start !== 0 && <Button onClick={() => setPage(page - 1)}>Prev</Button>}
        {end < total && <Button onClick={() => setPage(page + 1)}>Next</Button>}
      </div>
      {range(start, end).map((i) => (
        <HistoryPanel
          key={i}
          index={i}
          onClick={(e) => onClick(e, patches[i - 1])}
          patch={i === reverseHistory.length ? "" : patches[i]}
          nextPatch={i > 0 ? patches[i - 1] : ""}
          commit={getCommit(reverseHistory[i - 1])}
          editCommitMessage={(message) => editCommitMessage(message, i - 1)}
        />
      ))}
    </div>
  );
}

export default History;

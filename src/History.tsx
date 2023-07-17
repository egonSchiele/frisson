import * as Diff from "diff";
import range from "lodash/range";
import React, { useState, useEffect, useContext } from "react";
import Button from "./components/Button";
import Input from "./components/Input";
import Select from "./components/Select";
import * as t from "./Types";
import Panel from "./components/Panel";
import { getHtmlDiff } from "./lib/diff";
import { useSelector } from "react-redux";
import { RootState } from "./store";
import LibraryContext from "./LibraryContext";

const WINDOW = 5;

function HistoryPanel({ index, patch, nextPatch, rawPatch, onClick }) {
  const viewMode = useSelector((state: RootState) => state.library.viewMode);
  const fullscreen = viewMode === "fullscreen";

  if (!fullscreen) {
    return (
      <Panel
        title="History"
        // @ts-ignore
        onClick={(e) => {
          e.stopPropagation();
          onClick(e, patch);
        }}
        className="cursor-pointer"
        selector="history-panel"
      >
        <pre className="text-xs xl:text-sm">{rawPatch}</pre>
      </Panel>
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

function History({ bookid, chapterid, triggerHistoryRerender, onClick }) {
  const [history, setHistory] = useState<t.History>([]);
  const [page, setPage] = useState(0);
  const viewMode = useSelector((state: RootState) => state.library.viewMode);
  const fullscreen = viewMode === "fullscreen";

  useEffect(() => {
    const func = async () => {
      const res = await fetch(`/api/getHistory/${bookid}/${chapterid}`, {
        credentials: "include",
      });
      if (!res.ok) {
        console.log(res.statusText);
        // dispatch({ type: "SET_ERROR", payload: res.statusText });
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

  const applyPatch = (index) => {
    if (index < 0) return "";
    if (!history || !history[index]) return "";
    let old = history[0];
    if (index === 0) return old;

    history.slice(1, index + 1).forEach((patch) => {
      const result = Diff.applyPatch(old, patch);
      if (result) old = result;
    });
    return old;
  };

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
            rawPatch={patch}
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
          rawPatch={reverseHistory[i - 1]}
        />
      ))}
    </div>
  );
}

export default History;

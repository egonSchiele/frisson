import React from "react";
import { useSelector } from "react-redux";
import { getSelectedChapterVisibleTextLength } from "./reducers/librarySlice";
import { RootState } from "./store";

export default function ProgressBar({}) {
  let currentChapterLength = useSelector(getSelectedChapterVisibleTextLength);
  let activeTextIndex = useSelector(
    (state: RootState) => state.library.editor.activeTextIndex
  );

  if (!currentChapterLength) {
    return null;
  }

  if (activeTextIndex === undefined) {
    activeTextIndex = 0;
  }

  const progress = Math.round(
    (activeTextIndex + 1 / currentChapterLength) * 100
  );
  console.log("progress", progress, activeTextIndex, currentChapterLength);
  return (
    <div
      className={`h-2 w-screen absolute left-0 bottom-0 z-50 flex-grow text-gray-700 `}
      id="progress-bar"
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <line
          x1="0"
          y1="0"
          x2={`${progress}%`}
          y2="0"
          stroke="rgb(55, 65, 81)"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}

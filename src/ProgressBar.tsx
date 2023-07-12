import React from "react";
import { useSelector } from "react-redux";
import { getSelectedChapterVisibleTextLength } from "./reducers/librarySlice";
import { RootState } from "./store";

export default function ProgressBar({}) {
  let currentChapterLength = useSelector(getSelectedChapterVisibleTextLength);
  let activeTextIndex = useSelector(
    (state: RootState) => state.library.editor.activeTextIndex
  );

  if (!currentChapterLength || currentChapterLength < 2) {
    return null;
  }

  if (activeTextIndex === undefined) {
    activeTextIndex = 0;
  }

  const progress = Math.round(
    ((activeTextIndex + 1) / currentChapterLength) * 100
  );
  console.log("progress", progress, activeTextIndex, currentChapterLength);
  return (
    <div
      className={`h-1 w-screen absolute left-0 top-9 z-50 text-gray-600 flex-grow `}
      id="progress-bar"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-1 w-full">
        <defs>
          <linearGradient id="myGradient" gradientTransform="rotate(0)">
            <stop offset="5%" stopColor="black" />
            <stop offset="95%" stopColor="rgb(75 85 99)" />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width={`${progress}%`}
          height="100%"
          fill="url('#myGradient')"
          strokeWidth="0"
        />
      </svg>
    </div>
  );
}

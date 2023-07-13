import React from "react";
import { useSelector } from "react-redux";
import {
  getProgress,
  getSelectedChapterVisibleTextLength,
} from "./reducers/librarySlice";
import { RootState } from "./store";

export default function ProgressBar({}) {
  const progress = useSelector(getProgress);
  /* console.log("progress", progress); */
  if (progress === null) return null;
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

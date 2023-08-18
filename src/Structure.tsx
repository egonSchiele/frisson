import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getProgress,
  getSelectedChapter,
  getSelectedChapterVisibleTextLength,
  librarySlice,
} from "./reducers/librarySlice";
import { RootState } from "./store";
import { round } from "./utils";
import { useColors } from "./lib/hooks";

export default function Structure({}) {
  const currentChapter = useSelector(getSelectedChapter);
  const dispatch = useDispatch();
  const [currentText, setCurrentText] = React.useState("");
  const colors = useColors();
  if (!currentChapter) return null;

  const visibleBlocks = currentChapter.text.filter(
    (block) => !block.hideInExport && block.type !== "embeddedText"
  );

  const totalLength = visibleBlocks.reduce(
    (acc, block) => acc + block.text.length,
    0
  );

  const uncoloredLength = visibleBlocks
    .filter((block) => !block.blockColor || block.blockColor === "none")
    .reduce((acc, block) => acc + block.text.length, 0);

  const uncoloredPercent = round((uncoloredLength / totalLength) * 100);

  let currentX = 0;
  const blockRects = [];
  currentChapter.text.forEach((block, index) => {
    if (block.hideInExport || block.type === "embeddedText") return;
    const width = round((block.text.length / totalLength) * 100);
    const fill: string = block.blockColor || "none"; //index % 2 === 0 ? "#aaa" : "#bbb";
    const fillColor = {
      red: "#e63946",
      yellow: "#bda13c",
      green: "#588157",
      blue: "#457b9d",
      none: "#718096",
    }[fill];
    blockRects.push(
      <rect
        key={`${index}rect`}
        x={`${currentX}%`}
        y="0"
        width={`${width}%`}
        height="100%"
        fill={fillColor}
        strokeWidth="0"
        onMouseEnter={() =>
          setCurrentText(block.text.substring(0, 200) + ` (${width})%`)
        }
        onMouseLeave={() => setCurrentText(`Uncolored: ${uncoloredPercent}%`)}
        onClick={(event) => {
          if (event.metaKey) {
            dispatch(librarySlice.actions.resetBlockColor({ index }));
          } else {
            dispatch(librarySlice.actions.cycleBlockColor({ index }));
          }
        }}
      />
      /*     <text
        key={`${index}text`}
        x={`${currentX}%`}
        y="50%"
        className="text-xs !text-white"
      >
        {block.text.substring(0, 10)}
      </text> */
    );
    currentX += width;
  });

  return (
    <div
      className={`h-30 w-full ${colors.primaryTextColor} mb-md `}
      id="structure"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-30 w-full">
        <defs>
          <linearGradient id="myGradient" gradientTransform="rotate(0)">
            <stop offset="5%" stopColor="black" />
            <stop offset="95%" stopColor="rgb(75 85 99)" />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width={`100%`}
          height="100%"
          fill="black"
          strokeWidth="0"
        />
        {blockRects}
      </svg>
      <p className="text-sm text-gray-400 h-16 mt-xs">{currentText}</p>
    </div>
  );
}

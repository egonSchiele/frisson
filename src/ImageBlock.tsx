import * as t from "./Types";
import { useDispatch } from "react-redux";
import { librarySlice } from "./reducers/librarySlice";
import { useState } from "react";
import React from "react";
import { useColors, useFonts } from "./lib/hooks";
function Image({ url, className = "" }) {
  return <img src={url} className={`${className}`} />;
}

export default function ImageBlock({
  text,
  index,
}: {
  text: t.ImageBlock;
  index: number;
}) {
  const dispatch = useDispatch();
  const colors = useColors();
  const { fontSizeClass } = useFonts();
  function setActiveTextIndex() {
    dispatch(librarySlice.actions.setActiveTextIndex(index));
  }

  const images = text.text.split("\n").filter((x) => x !== "");

  if (text.open === false) {
    return (
      <div
        className={`my-md ${fontSizeClass} italic ${colors.secondaryTextColor} ml-lg`}
        onClick={setActiveTextIndex}
      >
        {images.length} images hidden.
      </div>
    );
  }

  if (text.display === "linear") {
    return (
      <div
        className="mb-lg grid grid-cols-1 gap-2"
        onClick={setActiveTextIndex}
      >
        {images.map((url) => (
          <Image url={url} key={url} className="max-w-60 mx-auto" />
        ))}
      </div>
    );
  } else {
    return (
      <div
        className="my-sm grid grid-cols-1 md:grid-cols-3 gap-2"
        onClick={setActiveTextIndex}
      >
        {images.map((url) => (
          <Image url={url} key={url} />
        ))}
      </div>
    );
  }
}

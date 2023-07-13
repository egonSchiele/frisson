import * as t from "./Types";
import { useDispatch } from "react-redux";
import { librarySlice } from "./reducers/librarySlice";
import { useState } from "react";
import React from "react";
function Image({ url }) {
  return <img src={url} />;
}

export default function ImageBlock({ text }: { text: t.ImageBlock }) {
  const dispatch = useDispatch();
  const images = text.text.split("\n");
  if (text.display === "linear") {
    return (
      <div className="my-sm grid grid-cols-1 gap-2">
        {images.map((url) => (
          <Image url={url} key={url} />
        ))}
      </div>
    );
  } else {
    return (
      <div className="my-sm grid grid-cols-3 gap-2">
        {images.map((url) => (
          <Image url={url} key={url} />
        ))}
      </div>
    );
  }
}

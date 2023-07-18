import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { EditorState } from "./Types";
import Button from "./components/Button";
import List from "./components/List";
import ListItem from "./components/ListItem";
import sortBy from "lodash/sortBy";

import {
  getSelectedBook,
  getSelectedChapter,
  librarySlice,
} from "./reducers/librarySlice";
import { RootState } from "./store";
import { useColors, useFonts } from "./lib/hooks";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { nanoid } from "nanoid";

export default function ShowAllVersions({ index }) {
  const state: EditorState = useSelector(
    (state: RootState) => state.library.editor
  );
  const currentBook = useSelector(getSelectedBook);

  const currentChapter = useSelector(getSelectedChapter);
  const currentText = currentChapter.text[index];
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const colors = useColors();
  const { fontClass, fontSizeClass } = useFonts();
  const items = [];

  if (currentText.type === "embeddedText") {
    items.push(<p key="err">Embedded text blocks cannot have versions</p>);
  } else {
    const versions = [{ text: currentText.text, id: null }];
    if (currentText.versions) {
      versions.push(...currentText.versions);
    }
    items.push(
      <h1
        key="title"
        className={`${fontClass} typography col-span-2 !text-2xl`}
      >
        {versions.length} Versions
      </h1>
    );
    sortBy(versions, ["text"]).forEach((version, i) => {
      items.push(
        <div
          className={`${colors.borderColor} ${fontClass} ${fontSizeClass} border typography p-sm rounded-md cursor-pointer max-h-108 overflow-scroll`}
          key={version.id}
          onClick={() => {
            if (version.id !== null) {
              dispatch(
                librarySlice.actions.switchVersion({
                  index,
                  versionid: version.id,
                })
              );
            }
            dispatch(librarySlice.actions.setActiveTextIndex(index));
            dispatch(
              librarySlice.actions.toggleShowAllVersions({
                index,
              })
            );
          }}
        >
          <pre className={`${fontClass} ${fontSizeClass} typography`}>
            {version.text}
          </pre>
        </div>
      );
    });
  }
  return <div className="grid grid-cols-2 gap-sm my-sm mx-lg">{items}</div>;
}

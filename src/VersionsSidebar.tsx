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
import { useColors } from "./lib/hooks";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function VersionsSidebar() {
  const state: EditorState = useSelector(
    (state: RootState) => state.library.editor
  );
  const currentBook = useSelector(getSelectedBook);
  const index = state.activeTextIndex;
  const currentChapter = useSelector(getSelectedChapter);
  const currentText = currentChapter.text[index];
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const colors = useColors();
  const items = [];

  if (currentText.type === "embeddedText") {
    items.push(<p key="err">Embedded text blocks cannot have versions</p>);
  } else {
    const versions = [{ text: currentText.text, id: null }];
    if (currentText.versions) {
      versions.push(...currentText.versions);
    }
    sortBy(versions, ["text"]).forEach((version, i) => {
      const title = version.text.split("\n")[0].substring(0, 20);
      let menuItems = [];
      if (version.id !== null) {
        menuItems.push({
          label: "Delete",
          /*           icon: <XMarkIcon />,
           */ onClick: () => {
            dispatch(
              librarySlice.actions.deleteVersion({
                index,
                versionid: version.id,
              })
            );
          },
        });
      }
      items.push(
        <ListItem
          key={i}
          title={title}
          selected={version.id === null}
          onClick={() => {
            if (version.id !== null) {
              dispatch(
                librarySlice.actions.switchVersion({
                  index,
                  versionid: version.id,
                })
              );
            }
          }}
          menuItems={menuItems}
        />
      );
    });

    items.push(
      <Button
        key="new version"
        onClick={() =>
          dispatch(
            librarySlice.actions.addVersion({
              index,
            })
          )
        }
        style="secondary"
        className="w-full mt-sm"
      >
        Add New Version
      </Button>
    );

    if (currentText.showAllVersions) {
      items.push(
        <Button
          key="dontShowAllVersions"
          onClick={() =>
            dispatch(
              librarySlice.actions.toggleShowAllVersions({
                index,
              })
            )
          }
          className="w-full mt-sm"
        >
          Don't Show All Versions
        </Button>
      );
    } else {
      items.push(
        <Button
          key="showAllVersions"
          onClick={() =>
            dispatch(
              librarySlice.actions.toggleShowAllVersions({
                index,
              })
            )
          }
          className="w-full mt-sm"
        >
          Show All Versions
        </Button>
      );
    }
  }
  return (
    <List
      title="Versions"
      items={items}
      leftMenuItem={null}
      rightMenuItem={null}
      selector="versionsList"
      className={`${colors.background} border-r ${colors.borderColor}`}
    />
  );
}

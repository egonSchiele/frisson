import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import React, { useContext, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import LibraryContext from "./LibraryContext";
import * as t from "./Types";
import Button from "./components/Button";
import List from "./components/List";
import {
  getSelectedBook,
  getSelectedChapter,
  getText,
  librarySlice,
} from "./reducers/librarySlice";
import { RootState } from "./store";
import { useColors } from "./lib/hooks";
import { Square2StackIcon } from "@heroicons/react/24/outline";
import { nanoid } from "nanoid";
import { get } from "cypress/types/lodash";

function getLabelForText(text: t.TextBlock) {
  let label = text.caption;
  if (!label) {
    label = text.text;
  }
  label = label.substring(0, 40);
  return label;
}

function OutlineItem({ text, i }) {
  const currentBook = useSelector(getSelectedBook);
  const index = useSelector(
    (state: RootState) => state.library.editor.activeTextIndex
  );
  const currentChapter = useSelector(getSelectedChapter);
  const navigate = useNavigate();
  const colors = useColors();
  const label = getLabelForText(text);
  let selectedCss = text.hideInExport
    ? "text-gray-700 dark:text-gray-500"
    : "text-gray-900 dark:text-gray-300";
  if (i === index) {
    selectedCss = "bg-gray-200 dark:bg-gray-700 dark:text-gray-200";
  }
  return (
    <li
      key={i}
      onClick={() => {
        navigate(
          `/book/${currentBook!.bookid}/chapter/${
            currentChapter!.chapterid
          }/${i}`
        );
      }}
      className={`w-full flex text-sm mb-xs cursor-pointer p-xs border-b ${colors.borderColor} ${colors.itemHover}  ${selectedCss}`}
    >
      <p
        className={`flex-grow line-clamp-1 ${
          text.type === "code" && "font-mono"
        }`}
      >
        {i + 1}. {label}
      </p>
      {text.type !== "embeddedText" &&
        text.versions &&
        text.versions.length > 0 && (
          <Square2StackIcon
            className="h-4 w-4 flex-none mr-xs"
            aria-hidden="true"
          />
        )}
    </li>
  );
}

function DraggableChapterOutline({ chapter }: { chapter: t.Chapter }) {
  const dispatch = useDispatch();
  const colors = useColors();

  function onDragEnd(result: any) {
    console.log({ result });
    if (!result.destination) return;
    // const ids = sortedChapters.map((chapter) => chapter.chapterid);
    //
    // const [removed] = ids.splice(result.source.index, 1);
    // ids.splice(result.destination.index, 0, removed);
    //
    dispatch(
      librarySlice.actions.moveBlock({
        sourceIndex: result.source.index,
        destinationIndex: result.destination.index,
      })
    );
  }

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {chapter.text.map((text, index) => {
                let selectedCss = text.hideInExport
                  ? "text-gray-700 dark:text-gray-500"
                  : "text-gray-900 dark:text-gray-300";

                return (
                  <Draggable
                    /* TODO what if ID is null? */
                    key={text.id}
                    draggableId={text.id}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`w-full flex text-sm mb-xs cursor-pointer p-xs border-b ${colors.borderColor} ${colors.itemHover}  ${selectedCss}`}
                      >
                        {index + 1}. {getLabelForText(text)}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

export default function OutlineSidebar() {
  const currentChapter = useSelector(getSelectedChapter);
  const [editing, setEditing] = React.useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const colors = useColors();

  if (!currentChapter) return null;
  const items = [];

  if (editing) {
    items.push(
      <Button
        onClick={() => {
          setEditing(false);
        }}
        key="doneEditing"
        style="secondary"
        className="w-full my-xs"
      >
        Done
      </Button>
    );
    items.push(
      <DraggableChapterOutline
        key="draggableOutline"
        chapter={currentChapter!}
      />
    );
  } else {
    items.push(
      currentChapter!.text.map((text, i) => {
        return <OutlineItem key={text.id || i} text={text} i={i} />;
      })
    );
    items.push(
      <Button
        onClick={() => {
          setEditing(true);
        }}
        key="reorder"
        className="w-full my-xs"
      >
        Reorder
      </Button>
    );
  }

  items.push(
    <Button
      onClick={async () => {
        currentChapter.text.forEach((text, i) => {
          dispatch(librarySlice.actions.openBlock(i));
        });
      }}
      key="openAll"
      className="w-full my-xs"
    >
      Open All Blocks
    </Button>,
    <Button
      onClick={async () => {
        currentChapter.text.forEach((text, i) => {
          dispatch(librarySlice.actions.closeBlock(i));
        });
      }}
      key="closeAll"
      className="w-full my-xs"
    >
      Close All Blocks
    </Button>
  );

  return (
    <List
      title="Outline"
      items={items}
      leftMenuItem={null}
      rightMenuItem={null}
      selector="outlineList"
    />
  );
}

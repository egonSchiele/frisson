import { librarySlice } from "./reducers/librarySlice";
import React from "react";
import * as t from "./Types";
import { useColors } from "./lib/hooks";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { nanoid } from "nanoid";
import { useDispatch } from "react-redux";
import Input from "./components/Input";
import Button from "./components/Button";

function Todo({ text, checked, onClick, onDelete }) {
  const colors = useColors();
  function getStyle(checked) {
    let styles = ` w-full p-xs my-1 rounded-md text-sm cursor-pointer flex flex-grow `;
    if (checked) {
      styles += colors.selectedBackground;
    } else {
      styles += colors.backgroundAlt;
    }
    return styles;
  }
  return (
    <div className="flex w-full xl:w-108 mx-auto">
      <div className={getStyle(checked)} onClick={onClick}>
        <span className="flex-grow my-1 mx-xs">{text}</span>
        {checked && (
          <div className="shrink-0 text-white">
            <CheckIcon className="h-5 w-5 mt-1" />
          </div>
        )}
      </div>
      <div
        className={`shrink-0 ${colors.secondaryTextColor} rounded-md ml-xs ${colors.backgroundAlt} w-10 h-10 my-xs mx-xs flex-none cursor-pointer`}
        onClick={onDelete}
      >
        <XMarkIcon className="h-6 w-6 my-xs mx-xs inline" />
      </div>
    </div>
  );
}

export default function TodoListBlock({
  chapterid,
  text,
  index,
}: {
  chapterid: string;
  text: t.TodoListBlock;
  index: number;
}) {
  const dispatch = useDispatch();
  const [newTodoText, setNewTodoText] = React.useState("");

  function updateLine(lineIndex, updatedLine) {
    const lines = text.text.split("\n");
    lines[lineIndex] = updatedLine;
    const newText = lines.join("\n");
    dispatch(librarySlice.actions.setText({ index, text: newText }));
  }

  function cleanLine(line) {
    return line
      .replace(/^- \[x\]/, "")
      .replace(/^- \[\s*\]/, "")
      .replace(/^-\s*/, "")
      .trim();
  }

  const isDone = (line) => line.trim().startsWith("- [x]");

  function toggleTodo(index) {
    const lines = text.text.split("\n");
    const line = lines[index];
    let newLine;
    if (isDone(line)) {
      newLine = "- [ ] " + cleanLine(line);
    } else {
      newLine = "- [x] " + cleanLine(line);
    }
    updateLine(index, newLine);
  }

  function addTodo(todoText) {
    const lines = text.text.split("\n");
    const newLine = "- [ ] " + cleanLine(todoText);
    lines.push(newLine);
    const newText = lines.join("\n");
    dispatch(librarySlice.actions.setText({ index, text: newText }));
  }

  function deleteTodo(i) {
    const lines = text.text.split("\n");
    lines.splice(i, 1);
    const newText = lines.join("\n");
    dispatch(librarySlice.actions.setText({ index, text: newText }));
  }

  const onKeyDown = (evt) => {
    if (evt.key === "Enter") {
      evt.preventDefault();
      addTodo(newTodoText);
      setNewTodoText("");
    }
  };

  const todos = text.text
    .split("\n")
    //.filter((line) => cleanLine(line).trim().length > 0)
    .map((line, i) => {
      let text = cleanLine(line);
      const checked = isDone(line);

      return (
        <Todo
          key={nanoid()}
          text={text}
          checked={checked}
          onClick={() => toggleTodo(i)}
          onDelete={() => deleteTodo(i)}
        />
      );
    });
  return (
    <div className="mb-sm w-full grid grid-cols-1">
      {todos}

      <div className="w-full xl:w-108 mx-auto mt-md">
        <Input
          name="newTodo"
          title="Add Todo"
          className="mt-sm"
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button
          size="medium"
          style="primary"
          className="w-full"
          onClick={() => {
            addTodo(newTodoText);
            setNewTodoText("");
            // @ts-ignore
            window.plausible("add-todo-button-click");
          }}
        >
          Add Todo
        </Button>
      </div>
    </div>
  );
}

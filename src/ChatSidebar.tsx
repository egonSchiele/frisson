import * as t from "./Types";
import Input from "./components/Input";
import * as fd from "./lib/fetchData";
import React, { useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { EditorState, LibraryContextType } from "./Types";
import Button from "./components/Button";
import List from "./components/List";
import ListItem from "./components/ListItem";
import sortBy from "lodash/sortBy";

import {
  getSelectedBook,
  getSelectedChapter,
  getText,
  librarySlice,
} from "./reducers/librarySlice";
import { RootState } from "./store";
import { text } from "express";
import LibraryContext from "./LibraryContext";
import Spinner from "./components/Spinner";
import { useLocalStorage } from "./utils";
import TextArea from "./components/TextArea";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useColors } from "./lib/hooks";

function Chat({ role, content, className = null }) {
  return (
    <pre
      className={`py-xs px-sm text-lg mb-sm rounded sansSerif ${
        role === "user" ? "bg-gray-800" : "bg-gray-600"
      } ${className}`}
    >
      {content}
    </pre>
  );
}

export default function ChatSidebar() {
  const state: EditorState = useSelector(
    (state: RootState) => state.library.editor
  );
  const currentBook = useSelector(getSelectedBook);
  const currentText = useSelector(getText(state.activeTextIndex));

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { settings } = useContext(LibraryContext) as LibraryContextType;
  const [chatHistory, setChatHistory] = useLocalStorage<t.ChatHistory[]>(
    "chatHistory",
    []
  );
  const [chatInput, setChatInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const colors = useColors();

  function getTextForSuggestions() {
    if (!currentText) return "";
    let { text } = currentText;
    if (
      state._cachedSelectedText &&
      state._cachedSelectedText.contents &&
      state._cachedSelectedText.contents.length > 0
    ) {
      text = state._cachedSelectedText.contents;
    }
    return text;
  }

  async function sendChat() {
    const contextSize = 3;
    const start = Math.max(0, chatHistory.length - contextSize);
    const end = chatHistory.length - 1;
    let prompt = chatInput;
    prompt = prompt.replaceAll("{{text}}", getTextForSuggestions());
    prompt = prompt.replaceAll("{{synopsis}}", currentBook?.synopsis || "");

    setLoading(true);
    const newChatHistory = [...chatHistory];
    newChatHistory.push({ role: "user", content: prompt });
    setChatHistory(newChatHistory);

    const result = await fd.fetchSuggestions(
      "",
      "",
      settings.model,
      1,
      settings.max_tokens,
      prompt,
      chatHistory.slice(start, end)
    );

    if (result.tag === "error") {
      dispatch(librarySlice.actions.setError(result.message));
      // undo adding user's input, in case the error is the message was too long
      newChatHistory.pop();
      // newChatHistory.push({ role: "system", content: result.message });
    } else {
      result.payload.forEach((choice: { text: any }) => {
        const generatedText = choice.text;
        newChatHistory.push({ role: "system", content: generatedText });
      });
    }

    setLoading(false);
    setChatHistory(newChatHistory);
  }

  const items: any[] = [];

  chatHistory.forEach((chat, i) => {
    items.push(<Chat key={i} {...chat} />);
  });
  items.push(
    <TextArea
      key="input"
      value={chatInput}
      onChange={(e) => setChatInput(e.target.value)}
      name="chatInput"
      title="Input"
      rounded={true}
      rows={6}
      inputClassName="!text-lg"
    />,
    <Button
      style="secondary"
      key="send"
      onClick={sendChat}
      className="w-full"
      selector="chat-send"
    >
      Send
    </Button>
  );

  const spinner = {
    label: "Loading",
    icon: <Spinner className="w-5 h-5" />,
    onClick: () => {},
  };

  const clear = {
    label: "Clear",
    icon: <TrashIcon className="w-5 h-5" />,
    onClick: () => {
      setChatHistory([]);
    },
  };

  return (
    <List
      title="Chat"
      items={items}
      leftMenuItem={loading ? spinner : null}
      rightMenuItem={clear}
      className="border-l w-full"
      selector="chatList"
    />
  );
}

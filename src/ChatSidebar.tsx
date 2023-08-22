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
import { prettyDate, useLocalStorage } from "./utils";
import TextArea from "./components/TextArea";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useColors } from "./lib/hooks";

function Message({ role, content, className = null }) {
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
  const [chatHistory, setChatHistory] = useLocalStorage<t.Chat[]>(
    "chatHistory2",
    []
  );
  const [currentChatIndex, setCurrentChatIndex] = useLocalStorage<number>(
    "currentChatIndex",
    0
  );
  const [chatInput, setChatInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const colors = useColors();
  const currentChat = chatHistory[currentChatIndex];

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
    if (!currentChat) {
      dispatch(
        librarySlice.actions.setError(
          `No chat found at index ${currentChatIndex}`
        )
      );
      return;
    }
    const start = Math.max(0, currentChat.messages.length - contextSize);
    const end = currentChat.messages.length - 1;
    let prompt = chatInput;
    prompt = prompt.replaceAll("{{text}}", getTextForSuggestions());
    prompt = prompt.replaceAll("{{synopsis}}", currentBook?.synopsis || "");

    setLoading(true);
    const newChat = structuredClone(currentChat);
    newChat.messages.push({
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    });

    setChatHistory((history) => {
      history[currentChatIndex] = newChat;
      return history;
    });

    const params: t.FetchSuggestionsParams = {
      model: settings.model,
      num_suggestions: 1,
      max_tokens: settings.max_tokens || 1,
      prompt,
      messages: newChat.messages.slice(start, end),
      customKey: settings.customKey || null,
      replaceParams: {
        text: getTextForSuggestions(),
        synopsis: currentBook?.synopsis || "",
      },
    };

    const result = await fd.fetchSuggestions(params);

    if (result.tag === "error") {
      dispatch(librarySlice.actions.setError(result.message));
      // undo adding user's input, in case the error is the message was too long
      newChat.messages.pop();
      // newChatHistory.push({ role: "system", content: result.message });
    } else {
      result.payload.forEach((choice: { text: any }) => {
        const generatedText = choice.text;
        newChat.messages.push({
          role: "system",
          content: generatedText,
          timestamp: Date.now(),
        });
      });
      const firstMessage = newChat.messages[0];
      newChat.title = firstMessage.content;
      if (firstMessage.timestamp) {
        newChat.subtitle = prettyDate(firstMessage.timestamp);
      }
    }

    setLoading(false);
    setChatHistory((history) => {
      history[currentChatIndex] = newChat;
      return history;
    });
  }

  const items: any[] = [];

  if (currentChat) {
    currentChat.messages.forEach((message, i) => {
      items.push(<Message key={i} {...message} />);
    });
    items.push(
      <TextArea
        key="input"
        value={chatInput}
        onChange={(e) => setChatInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.metaKey) {
            sendChat();
          }
        }}
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
  } else {
    items.push(
      <Message
        key="no-chat"
        role="system"
        content="Select a chat or create a new chat"
      />
    );
  }

  const spinner = {
    label: "Loading",
    icon: <Spinner className="w-5 h-5" />,
    onClick: () => {},
  };

  const clear = {
    label: "Clear",
    icon: <TrashIcon className="w-5 h-5" />,
    onClick: () => {
      setChatHistory((history) => {
        history.splice(currentChatIndex, 1);
        return history;
      });
      setCurrentChatIndex((index) => Math.max(0, index - 1));
    },
  };

  const newChat = {
    label: "New Chat",
    icon: <PlusIcon className="w-5 h-5" />,
    onClick: () => {
      setChatHistory((history) => {
        history.push({ title: "new chat", subtitle: "", messages: [] });
        return history;
      });
      setCurrentChatIndex(chatHistory.length - 1);
    },
  };

  const allChats = chatHistory.map((chat, i) => {
    return (
      <ListItem
        key={i}
        selected={currentChatIndex === i}
        title={`${chat.title} (${chat.messages.length} messages)`}
        content={chat.subtitle}
        onClick={() => setCurrentChatIndex(i)}
      />
    );
  });

  return (
    <div className={`grid grid-cols-4 w-full`}>
      <List
        title="All Chats"
        items={allChats}
        rightMenuItem={newChat}
        className="border-l col-span-1"
        selector="allChatsList"
      />
      <List
        title="Chat"
        items={items}
        leftMenuItem={loading ? spinner : null}
        rightMenuItem={clear}
        className="border-l col-span-3"
        selector="chatList"
      />
    </div>
  );
}

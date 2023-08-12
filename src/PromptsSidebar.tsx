import React, { useContext } from "react";
import { useDispatch } from "react-redux";
import LibraryContext from "./LibraryContext";
import * as t from "./Types";
import List from "./components/List";
import ListItem from "./components/ListItem";

export default function PromptsSidebar({}: {}) {
  // const state = useSelector((state: RootState) => state.library.editor);
  const dispatch = useDispatch();
  const { settings, fetchSuggestions } = useContext(
    LibraryContext
  ) as t.LibraryContextType;

  const prompts = settings.prompts.map((prompt, i) => (
    <li key={i}>
      <ListItem
        title={prompt.label}
        selected={false}
        plausibleEventName="prompt-click"
        onClick={async () => {
          await fetchSuggestions(prompt, []);
        }}
        selector={`prompt-${prompt.label}-button`}
      />
    </li>
  ));

  return (
    <List
      title="Prompts"
      items={prompts}
      className="border-r"
      rightMenuItem={null}
      leftMenuItem={null}
    />
  );
}

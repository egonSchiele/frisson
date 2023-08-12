import React, { useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import LibraryContext from "./LibraryContext";
import * as t from "./Types";
import List from "./components/List";
import ListItem from "./components/ListItem";
import { RootState } from "./store";

export default function PromptsSidebar({}: {}) {
  const _cachedSelectedText = useSelector(
    (state: RootState) => state.library.editor._cachedSelectedText
  );
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
          if (prompt.action === "replaceSelection") {
            await fetchSuggestions(prompt, [], {
              type: "replaceSelection",
              selection: _cachedSelectedText,
            });
          } else {
            await fetchSuggestions(prompt, [], {
              type: "addToSuggestionsList",
            });
          }
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

import React from "react";
import Panel from "./components/Panel";
import { useColors, useFonts } from "./lib/hooks";
import { librarySlice } from "./reducers/librarySlice";
import { useDispatch } from "react-redux";
import { AppDispatch } from "./store";
export default function SuggestionPanel({ title, contents, onDelete }) {
  const colors = useColors();
  const { fontSizeClass } = useFonts();
  const dispatch = useDispatch<AppDispatch>();

  return (
    <Panel
      className="cursor-pointer"
      title={title}
      onClick={() => {
        dispatch(librarySlice.actions.addToContents(contents));
      }}
      onDelete={onDelete}
      selector="ai-suggestion-panel"
    >
      <p className={``}>{contents}</p>
    </Panel>
  );
}

import React from "react";
import Panel from "./components/Panel";
import { useColors, useFonts } from "./lib/hooks";
import { librarySlice } from "./reducers/librarySlice";
import { useDispatch } from "react-redux";
import { AppDispatch } from "./store";
import Button from "./components/Button";
export default function SuggestionPanel({
  title,
  contents,
  onDelete,
  index,
  savedForLater,
}) {
  const colors = useColors();
  const { fontSizeClass } = useFonts();
  const dispatch = useDispatch<AppDispatch>();

  return (
    <div className="grid grid-cols-1">
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
      <div className="w-full grid grid-cols-1 gap-xs h-sm">
        <Button
          onClick={() => {
            if (savedForLater) {
              dispatch(
                librarySlice.actions.unmarkSuggestionSavedForLater(index)
              );
            } else {
              dispatch(librarySlice.actions.markSuggestionSavedForLater(index));
            }
          }}
        >
          {savedForLater && <span>Undo Save For Later</span>}
          {!savedForLater && <span>Save For Later</span>}
        </Button>
      </div>
    </div>
  );
}

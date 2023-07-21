import React from "react";
import Panel from "./components/Panel";
import { useColors, useFonts } from "./lib/hooks";
import { librarySlice } from "./reducers/librarySlice";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "./store";
import Button from "./components/Button";
export default function SuggestionPanel({
  title,
  contents,
  onDelete,
  index,
  savedForLater,
}) {
  const activeTextIndex = useSelector(
    (state: RootState) => state.library.editor.activeTextIndex
  );
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
        <pre className={`sansSerif`}>{contents}</pre>
      </Panel>
      <div className="w-full grid grid-cols-2 gap-xs h-sm mb-md">
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
        <Button
          onClick={() => {
            dispatch(
              librarySlice.actions.addVersion({
                index: activeTextIndex,
                text: contents,
                setDiffWith: false,
              })
            );
            dispatch(librarySlice.actions.showVersionsPanel());
          }}
        >
          Add as Version
        </Button>
      </div>
    </div>
  );
}

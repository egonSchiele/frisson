import {
  Bars3Icon,
  ClipboardIcon,
  ClockIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  Square2StackIcon,
} from "@heroicons/react/24/outline";
import React, { useContext, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getSelectedChapter,
  getText,
  librarySlice,
} from "../reducers/librarySlice";
import { RootState } from "../store";

import { Tab } from "@headlessui/react";
import { useColors } from "../lib/hooks";
import { classNames, useLocalStorage } from "../utils";
import Info from "../Info";
import List from "../components/List";
import SuggestionPanel from "../SuggestionPanel";
import Switch from "../components/Switch";
import History from "../History";
import Settings from "../Settings";
import LibraryContext from "../LibraryContext";
import { LibraryContextType } from "../Types";
function Suggestions({ suggestions }) {
  const maximize = useSelector(
    (state: RootState) => state.library.viewMode === "fullscreen"
  );
  const [showSavedForLater, setShowSavedForLater] = useLocalStorage(
    "showSavedForLater",
    false
  );
  const dispatch = useDispatch();
  function onDelete(index: number) {
    dispatch(librarySlice.actions.deleteSuggestion(index));
  }

  if (!suggestions) return null;
  console.log({ suggestions });

  const gridCols = maximize ? "grid-cols-3" : "grid-cols-1";
  const countSavedForLater = suggestions.filter((s) => s.savedForLater).length;
  const items = [];

  suggestions.forEach((suggestion, index) => {
    if (!showSavedForLater && suggestion.savedForLater) {
      return;
    }
    items.push(
      <SuggestionPanel
        key={index}
        title={suggestion.type}
        contents={suggestion.contents}
        onDelete={() => onDelete(index)}
        index={index}
        savedForLater={suggestion.savedForLater || false}
      />
    );
  });
  let label = showSavedForLater
    ? "Hide Saved For Later"
    : "Show Saved For Later";
  label += ` (${countSavedForLater})`;
  return (
    <div>
      <Switch
        label={label}
        enabled={showSavedForLater}
        setEnabled={() => setShowSavedForLater(!showSavedForLater)}
        className="mb-sm"
      />
      <div className={`grid gap-sm ${gridCols}`}>{items}</div>
    </div>
  );
}

export default function Sidebar() {
  //const [selectedIndex, setSelectedIndex] = useState(tabIndex);

  const state = useSelector((state: RootState) => state.library.editor);
  const suggestions = useSelector(
    (state: RootState) => state.library.suggestions
  );
  const tab = useSelector(
    (state: RootState) => state.library.panels.rightSidebar.activePanel
  );
  const currentChapter = useSelector(getSelectedChapter);

  const index = state.activeTextIndex;
  const currentText = useSelector(getText(index));
  const colors = useColors();
  const dispatch = useDispatch();
  const { settings, setSettings, usage } = useContext(
    LibraryContext
  ) as LibraryContextType;

  let selectedIndex = 0;
  if (tab === "suggestions") selectedIndex = 1;
  if (tab === "history") selectedIndex = 2;
  if (tab === "settings") selectedIndex = 3;

  function setSelectedIndex(index: number) {
    if (index === 0) {
      dispatch(librarySlice.actions.setActivePanel("info"));
    } else if (index === 1) {
      dispatch(librarySlice.actions.setActivePanel("suggestions"));
    } else if (index === 2) {
      dispatch(librarySlice.actions.setActivePanel("history"));
    } else if (index === 3) {
      dispatch(librarySlice.actions.setActivePanel("settings"));
    }
  }

  if (!currentText) return null;
  function getClassNames({ selected }) {
    const defaultClasses =
      "w-full py-1 text-sm font-medium text-center focus:outline-none";
    return classNames(
      defaultClasses,
      selected ? `${colors.background}` : `${colors.selectedBackground}`
    );
  }
  return (
    <div className="w-full px-0">
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className={`flex border-r ${colors.borderColor}`}>
          <Tab className={getClassNames}>
            <InformationCircleIcon
              className={`w-5 h-5 mx-auto ${colors.secondaryTextColor}`}
            />
          </Tab>
          <Tab className={getClassNames}>
            <ClipboardIcon
              className={`w-5 h-5 mx-auto ${colors.secondaryTextColor}`}
            />
          </Tab>
          <Tab className={getClassNames}>
            <ClockIcon
              className={`w-5 h-5 mx-auto ${colors.secondaryTextColor}`}
            />
          </Tab>
          <Tab className={getClassNames}>
            <Cog6ToothIcon
              className={`w-5 h-5 mx-auto ${colors.secondaryTextColor}`}
            />
          </Tab>
        </Tab.List>
        <Tab.Panels className="">
          <Tab.Panel>
            <List
              title="Chapter Info"
              key="info"
              items={[<Info key="info" />]}
            />
          </Tab.Panel>
          <Tab.Panel>
            <List
              title={`Suggestions (${suggestions.length})`}
              className=""
              items={[
                <Suggestions key="suggestions" suggestions={suggestions} />,
              ]}
            />
          </Tab.Panel>
          <Tab.Panel>
            <List
              title="History"
              items={[
                <History
                  key="history"
                  chapterid={currentChapter.chapterid}
                  bookid={currentChapter.bookid}
                  triggerHistoryRerender={0}
                />,
              ]}
            />
          </Tab.Panel>
          <Tab.Panel>
            <List
              title="Settings"
              items={[
                <Settings
                  key="settings"
                  settings={settings}
                  usage={usage}
                  setSettings={setSettings}
                  onSave={() => {}}
                />,
              ]}
            />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}

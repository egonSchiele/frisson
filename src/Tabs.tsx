import * as t from "./Types";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  getSelectedChapter,
  getCompostBookId,
  getOpenTabs,
  librarySlice,
} from "./reducers/librarySlice";
import { RootState, AppDispatch } from "./store";
import { Link } from "react-router-dom";
import { BookOpenIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useColors } from "./lib/hooks";
//import { Tabs, TabList, TabPanels, Tab, TabPanel } from "@reach/tabs";

function Tab({ tab, current }: { tab: t.TabStateInfo; current: boolean }) {
  const dispatch = useDispatch<AppDispatch>();

  const colors = useColors();
  const currentCss = current
    ? `${colors.selectedBorderColor} ${colors.secondaryTextColorSelected}`
    : `border-transparent ${colors.secondaryTextColor} hover:border-gray-300 hover:text-gray-200`;
  let title = tab.title || "Untitled";
  //title = title.substring(0, 30);
  let link = "";
  if (tab.tag === "book") {
    link = `/book/${tab.bookid}`;
  } else {
    link = `/book/${tab.bookid}/chapter/${tab.chapterid}`;
  }
  if (tab.textIndex !== undefined) {
    link += `/${tab.textIndex}`;
  }
  if (tab.scrollTop !== undefined) {
    link += `/${tab.scrollTop}`;
  }

  //console.log("tab", tab, "link", link);
  return (
    <div
      className={`h-9 border-b-4 px-1 text-center text-sm flex flex-auto overflow-hidden font-medium cursor-pointer ${colors.itemHover} line-clamp-1 ${currentCss} max-w-md`}
    >
      <div className="flex">
        <Link to={link} className="h-9 text-center flex-grow">
          {/* <BookOpenIcon className="w-5 h-5 flex-none" /> */}
          <div className="tab-title h-9 text-center pt-xs">{title}</div>
        </Link>
        <XMarkIcon
          className="w-5 h-9 flex-none"
          onClick={() => {
            dispatch(librarySlice.actions.closeTab(tab));
          }}
        />
      </div>
    </div>
  );
}

export default function Tabs() {
  const state: t.State = useSelector((state: RootState) => state.library);

  const currentChapter = getSelectedChapter({ library: state });
  const currentBook = getSelectedChapter({ library: state });
  const compostBookId = useSelector(getCompostBookId);
  const editor = useSelector((state: RootState) => state.library.editor);
  const viewMode = useSelector((state: RootState) => state.library.viewMode);
  const openTabs = useSelector(getOpenTabs);
  const currentText = currentChapter?.text || [];

  const dispatch = useDispatch<AppDispatch>();

  return (
    <div className="h-9 bg-gray-100 dark:bg-gray-700">
      <nav className="h-9 flex" aria-label="Tabs">
        {openTabs.map((tab) => (
          <Tab
            key={tab.tag === "book" ? tab.bookid : tab.chapterid}
            tab={tab}
            current={
              tab.tag === "book" && !currentChapter
                ? currentBook?.bookid === tab.bookid
                : currentChapter?.chapterid === tab.chapterid
            }
          />
        ))}
      </nav>
    </div>
  );
}

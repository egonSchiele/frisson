import React, { useContext, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import * as t from "./Types";
import { LibraryContextType } from "./Types";
import Input from "./components/Input";
import List from "./components/List";
import ListItem from "./components/ListItem";

import LibraryContext from "./LibraryContext";
import { useColors } from "./lib/hooks";
import { RootState } from "./store";
import { getChapterText, useLocalStorage } from "./utils";
import {
  getSelectedChapter,
  getText,
  librarySlice,
} from "./reducers/librarySlice";
import Button from "./components/Button";
import Switch from "./components/Switch";

export default function ReplaceSidebar() {
  const books: t.Book[] = useSelector(
    (state: RootState) => state.library.books
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { settings } = useContext(LibraryContext) as LibraryContextType;

  const currentChapter = useSelector(getSelectedChapter);
  const colors = useColors();
  const [searchTerm, setSearchTerm] = useLocalStorage(
    "replaceSidebar-searchTerm",
    ""
  );
  const [replaceTerm, setReplaceTerm] = useLocalStorage(
    "replaceSidebar-replaceTerm",
    ""
  );
  const [followCapitalization, setFollowCapitalization] = useLocalStorage(
    "replaceSidebar-followCapitalization",
    true
  );
  const [replaceInAllBlocks, setReplaceInAllBlocks] = useLocalStorage(
    "replaceSidebar-replaceInAllBlocks",
    true
  );
  const searchRef = React.useRef(null);

  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchRef]);

  const line = (book, chapter) => (
    <ListItem
      title={`${book.title}/${chapter.title}`}
      key={chapter.chapterid}
      link={`/book/${book.bookid}/chapter/${chapter.chapterid}`}
      className="w-full"
      selected={false}
    />
  );

  const pretty = (obj) => JSON.stringify(obj, null, 2);

  if (!currentChapter) {
    return <p>Please select a chapter first</p>;
  }

  const items: any[] = [
    <Input
      name="search"
      title="Search (regex)"
      key="search"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      ref={searchRef}
    />,
    <Input
      name="replace"
      title="replace"
      key="replace"
      value={replaceTerm}
      onChange={(e) => setReplaceTerm(e.target.value)}
    />,
    <Switch
      key="followCapitalization"
      label="Follow Capitalization"
      enabled={followCapitalization}
      setEnabled={(enabled) => setFollowCapitalization(enabled)}
      className="mt-md"
    />,
    <Switch
      key="replaceInAllBlocks"
      label="Replace in all blocks"
      enabled={replaceInAllBlocks}
      setEnabled={(enabled) => setReplaceInAllBlocks(enabled)}
      className="mt-md"
    />,
  ];

  const countInString = (str: string): number => {
    const re = new RegExp(searchTerm, "gi");
    return (str.match(re) || []).length;
  };

  let resultCount = 0;
  if (searchTerm.length > 0) {
    currentChapter.text.forEach((block: t.TextBlock) => {
      resultCount += countInString(block.text);
      if (block.type !== "embeddedText" && block.versions) {
        block.versions.forEach((version: t.Version) => {
          resultCount += countInString(version.text);
        });
      }
    });
  }

  items.push(
    <p key="resultCount">
      {resultCount} results in {currentChapter.text.length} blocks
    </p>
  );

  if (resultCount > 0) {
    items.push(
      <p key="replaceInfo mt-xs">
        Replacing {searchTerm} with {replaceTerm}
      </p>,
      <Button
        key="replaceButton"
        onClick={() => {
          dispatch(
            librarySlice.actions.replaceText({
              searchTerm,
              replaceTerm,
              followCapitalization,
              replaceInAllBlocks,
            })
          );
        }}
        style="secondary"
        className="mt-sm w-full"
      >
        Replace
      </Button>
    );
  }

  return (
    <List
      title="Replace"
      items={items}
      leftMenuItem={null}
      rightMenuItem={null}
      className="border-r w-full"
      selector="replaceList"
      showScrollbar={true}
    />
  );
}

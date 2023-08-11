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
import { getChapterText, getStringContext, useLocalStorage } from "./utils";

function SearchResult({ book, chapter, index }) {
  return (
    <div className="flex flex-row justify-between items-center my-sm">
      <div className="flex flex-col">
        <Link to={`/book/${book.bookid}/chapter/${chapter.chapterid}`}>
          <div className="text-sm">
            {book.title}/{chapter.title}
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function SimpleSearchSidebar() {
  const books: t.Book[] = useSelector(
    (state: RootState) => state.library.books
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { settings } = useContext(LibraryContext) as LibraryContextType;
  const colors = useColors();
  const [searchTerm, setSearchTerm] = useLocalStorage("searchTerm", "");
  const searchRef = React.useRef(null);

  useEffect(() => {
    if (searchRef.current) {
      searchRef.current.focus();
    }
  }, [searchRef]);

  const line = (book, chapter, content) => (
    <ListItem
      title={`${book.title}/${chapter.title}`}
      key={chapter.chapterid}
      link={`/book/${book.bookid}/chapter/${chapter.chapterid}`}
      className="w-full"
      selected={false}
      content={content}
    />
  );

  const pretty = (obj) => JSON.stringify(obj, null, 2);

  const items: any[] = [
    <Input
      name="search"
      title="Search"
      key="search"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      ref={searchRef}
    />,
  ];

  const results = [];
  if (searchTerm.length > 0) {
    books.forEach((book) => {
      book.chapters.forEach((chapter) => {
        if (
          getChapterText(chapter, true)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        ) {
          const context = getStringContext(
            getChapterText(chapter, true),
            searchTerm,
            50
          );
          results.push(line(book, chapter, context));
        } else if (
          chapter.title.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          results.push(line(book, chapter, ""));
        }
      });
    });
  }
  items.push(...results);

  return (
    <List
      title="Search"
      items={items}
      leftMenuItem={null}
      rightMenuItem={null}
      className="border-r w-full"
      selector="searchList"
      showScrollbar={false}
    />
  );
}

import React, { useContext } from "react";
import * as t from "./Types";
import CodeBlock from "./components/CodeBlock";
import MarkdownBlock from "./components/MarkdownBlock";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "./store";
import LibraryContext from "./LibraryContext";
import { getFontSizeClass } from "./utils";
import ImageBlock from "./ImageBlock";
export default function ReadOnlyView({ textBlocks, fontClass }) {
  const state: t.State = useSelector((state: RootState) => state.library);
  const { settings } = useContext(LibraryContext) as t.LibraryContextType;
  let fontSize = settings.design?.fontSize || 18;
  const fontSizeClass = getFontSizeClass(fontSize);

  return textBlocks.map((text: t.TextBlock, index) => {
    if (text.type === "code") {
      return (
        <CodeBlock text={text.text} language={text.language} key={index} />
      );
    } else if (text.type === "markdown") {
      return (
        <MarkdownBlock text={text.text} key={index} className={fontClass} />
      );
    } else if (text.type === "image") {
      return <ImageBlock text={text} key={index} />;
    } else if (text.type === "embeddedText") {
      let chapter = null;
      let book = null;
      if (text.bookid) {
        book = state.books.find((book) => book.bookid === text.bookid);
        if (book) {
          chapter = book.chapters.find(
            (chapter) => chapter.chapterid === text.chapterid
          );
        }
      }
      if (chapter) {
        return (
          <ReadOnlyView
            textBlocks={chapter.text.filter((t) => t.open)}
            fontClass={fontClass}
          />
        );
      } else {
        return null;
      }
    } else {
      return (
        <div className={`w-full typography ${fontClass} ${fontSizeClass}`}>
          <pre key={index} className={` ${fontClass}`}>
            {text.text}
          </pre>
        </div>
      );
    }
  });
}

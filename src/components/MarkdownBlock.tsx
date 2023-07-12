import * as t from "../Types";
import React, { useContext } from "react";
import { marked } from "marked";
import * as DOMPurify from "dompurify";
import CodeBlock from "./CodeBlock";
import ReactDOMServer from "react-dom/server";
import LibraryContext from "../LibraryContext";
import { getFontSizeClass } from "../utils";

const renderer = {
  code(code, infostring, escaped) {
    const element = <CodeBlock text={code} language={infostring} />;
    const htmlString = ReactDOMServer.renderToString(element);
    return htmlString;
  },
};
marked.setOptions({ smartypants: true });
marked.use({ renderer });

export default function MarkdownBlock({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const { settings } = useContext(LibraryContext) as t.LibraryContextType;
  let fontSize = settings.design?.fontSize || 18;
  const fontSizeClass = getFontSizeClass(fontSize);
  let html = marked.parse(text);
  html = DOMPurify.sanitize(html);
  return (
    <div
      className={`typography markdown ${className} ${fontSizeClass}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

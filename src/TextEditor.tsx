import PlainClipboard from "./components/PlainClipboard";
import highlightErrors from "./focusModeChecks";
import { isTextishBlock } from "./utils";

import {
  ChevronDownIcon,
  ChevronRightIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import React, { useEffect, useRef, useState } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useDispatch, useSelector } from "react-redux";
import * as t from "./Types";
import Select from "./components/Select";
import "./globals.css";
import {
  getSelectedChapterTextLength,
  getText,
  librarySlice,
} from "./reducers/librarySlice";
import { RootState } from "./store";

import { useParams } from "react-router-dom";
import { useColors, useFonts } from "./lib/hooks";
import { languages } from "./lib/languages";
import { hasVersions } from "./utils";

let Inline = Quill.import("blots/inline");

class SpanClass extends Inline {
  static create(value) {
    let node = super.create();

    if (value) {
      node.setAttribute("class", `inline ${value}`);
      node.setAttribute("title", value);
    }
    return node;
  }
}

SpanClass.blotName = "class";
SpanClass.tagName = "div";
Quill.register(SpanClass);

let Block = Quill.import("blots/block");
Block.tagName = "div";
Quill.register(Block, true);

Quill.register("modules/clipboard", PlainClipboard, true);

const formats = [
  "background",
  "bold",
  "color",
  "font",
  "code",
  "italic",
  "link",
  "size",
  "strike",
  "script",
  "underline",
  "blockquote",
  // "header",
  //"indent",
  // "list", <-- commented-out to suppress auto bullets
  "align",
  "direction",
  "code-block",
  "formula",
  "image",
  "video",
  "class",
];

function LanguageSelector({ chapterid, index }) {
  const dispatch = useDispatch();
  const currentText: t.CodeBlock = useSelector(getText(index)) as t.CodeBlock;

  const { language } = currentText;
  return (
    <Select
      title=""
      name="language"
      value={language}
      className="w-fit dark:bg-gray-800 dark:border-gray-500 dark:text-gray-300 "
      onChange={(e) => {
        dispatch(
          librarySlice.actions.setLanguage({
            index,
            language: e.target.value,
          })
        );
      }}
    >
      {languages.map((lang) => (
        <option key={lang} value={lang}>
          {lang}
        </option>
      ))}
    </Select>
  );
}

function TextEditor({
  chapterid,
  index,
  settings,
}: {
  chapterid: string;
  index: number;
  settings: t.UserSettings;
}) {
  const _pushTextToEditor = useSelector(
    (state: RootState) => state.library.editor._pushTextToEditor
  );
  const _pushSelectionToEditor = useSelector(
    (state: RootState) => state.library.editor._pushSelectionToEditor
  );
  const _triggerFocusModeRerender = useSelector(
    (state: RootState) => state.library.editor._triggerFocusModeRerender
  );

  const activeTextIndex = useSelector(
    (state: RootState) => state.library.editor.activeTextIndex
  );

  const viewMode: t.ViewMode = useSelector(
    (state: RootState) => state.library.viewMode
  );

  const isActive = activeTextIndex === index;
  const currentText = useSelector(getText(index));
  const currentChapterTextLength = useSelector(getSelectedChapterTextLength);

  const dispatch = useDispatch();
  const colors = useColors();
  const { fontClass, fontSizeClass } = useFonts();

  const quillRef = useRef();
  const inputDiv = useRef<HTMLDivElement>();
  const { textindex } = useParams();
  const highlight = textindex && textindex === index.toString();
  const open = currentText.open; // || highlight;

  const [edited, setEdited] = useState(false);

  useEffect(() => {
    if (!quillRef.current) return;
    // @ts-ignore
    const editor = quillRef.current.getEditor();
    // TODO
    editor.setText(currentText.text.trim());
    highlightForFocusMode();
    formatMarkdown();

    /* if (viewMode === "readonly") {
      editor.disable();
    } */
  }, [quillRef.current, chapterid, _pushTextToEditor]);

  useEffect(() => {
    if (viewMode === "focus") {
      if (isActive) {
        highlightForFocusMode();
      }
    } else {
      clearFocusModeHighlights();
    }
  }, [viewMode, _triggerFocusModeRerender]);

  /*   function updateIndicatorPosition() {
    console.log("updateIndicatorPosition");
    if (!inputDiv.current) return;
    console.log("scrolling");
    const scrollTop = inputDiv.current.scrollTop;
    const scrollHeight = inputDiv.current.scrollHeight;
    const clientHeight = inputDiv.current.clientHeight;
    const widthRatio = clientHeight / scrollHeight;
    const indicatorWidth = widthRatio * 100;
    console.log({ indicatorWidth }, "%");
  }

  useEffect(() => {
    console.log("useEffect", { isActive, open });
    if (isActive) {
      focus();
      console.log("focus", inputDiv);

      if (!inputDiv.current) return;
      const scrollTop = inputDiv.current.scrollTop;
      const scrollHeight = inputDiv.current.scrollHeight;
      const clientHeight = inputDiv.current.clientHeight;
      const widthRatio = clientHeight / scrollHeight;
      const indicatorWidth = widthRatio * 100;
      console.log({ indicatorWidth }, "%");
      // Attach the scroll event listener to update the indicator position
      inputDiv.current.addEventListener("scroll", updateIndicatorPosition);
      return () => {
        if (!inputDiv.current) return;
        inputDiv.current.removeEventListener("scroll", updateIndicatorPosition);
      };
    }
  }, [activeTextIndex, open, inputDiv.current]); */

  useEffect(() => {
    if (isActive) {
      focus();
    }
  }, [activeTextIndex, open]);

  function highlightForFocusMode() {
    return;
    if (!isTextishBlock(currentText)) return;
    if (viewMode !== "focus") return;
    // @ts-ignore
    if (!quillRef.current || !quillRef.current.getEditor) return;
    // @ts-ignore
    const quill = quillRef.current.getEditor();
    const text = quill.getText();
    console.log("highlightForFocusMode");
    quill.removeFormat(0, text.length - 1);
    quill.setText(text.trim());
    const formatData = highlightErrors(text);
    console.log("applying", formatData.length, "formats");
    formatData.forEach(({ range, format }) => {
      quill.formatText(range, format);
    });
    console.log("applied.");
    dispatch(
      librarySlice.actions.setFocusModeChecks(
        formatData.filter((d) => d.name !== "clear")
      )
    );
  }

  function formatMarkdown() {
    if (!isTextishBlock(currentText)) return;
    // @ts-ignore
    if (!quillRef.current || !quillRef.current.getEditor) return;
    // @ts-ignore
    const quill = quillRef.current.getEditor();
    const text = quill.getText();
    quill.removeFormat(0, text.length - 1);

    /*   function formatFor(line:string, index:number, prefix: string, format: string) {
      if (!line.startsWith(prefix)) return;
      quill.formatText(index, prefix.length, { class: "grayedout" });
      quill.formatText(index + prefix.length, line.length - prefix.length, {
        class: format,
      });
    } */

    const lines = text.split("\n");
    let index = 0;
    lines.forEach((line, i) => {
      const lineLength = line.length;

      if (line.startsWith("# ")) {
        quill.formatText(index, 1, { class: "grayedout" });
        quill.formatText(index + 2, lineLength - 2, { class: "h1" });
      } else if (line.startsWith("## ")) {
        quill.formatText(index, 2, { class: "grayedout" });
        quill.formatText(index + 3, lineLength - 3, { class: "h2" });
      } else if (line.startsWith("### ")) {
        quill.formatText(index, 3, { class: "grayedout" });
        quill.formatText(index + 4, lineLength - 4, { class: "h3" });
      } else if (line.startsWith("#### ")) {
        quill.formatText(index, 4, { class: "grayedout" });
        quill.formatText(index + 5, lineLength - 5, { class: "h4" });
      } else if (line.startsWith("http")) {
        quill.formatText(index, lineLength, { class: "link" });
      }
      index += lineLength + 1;
    });
  }

  function clearFocusModeHighlights() {
    return;
    // @ts-ignore
    if (!quillRef.current || !quillRef.current.getEditor) return;
    // @ts-ignore
    const quill = quillRef.current.getEditor();
    const text = quill.getText();
    quill.formatText({ index: 0, length: text.length }, { class: null });
    dispatch(librarySlice.actions.setFocusModeChecks(null));
  }

  useEffect(() => {
    if (isActive && _pushSelectionToEditor && quillRef.current) {
      // @ts-ignore
      const editor = quillRef.current.getEditor();
      if (_pushSelectionToEditor.index === -1) {
        editor.setSelection(editor.getLength());
      } else {
        //editor.setSelection(_pushSelectionToEditor);
        highlightForFocusMode();
        editor.formatText(_pushSelectionToEditor, { class: "selectedText" });
      }
      dispatch(librarySlice.actions.clearPushSelectionToEditor());
    }
  }, [activeTextIndex, _pushSelectionToEditor]);

  useEffect(() => {
    if (!inputDiv.current) return;
    if (textindex === index.toString()) {
      // @ts-ignore
      inputDiv.current.scrollIntoViewIfNeeded(false);
      window.scrollTo(0, 0);
      dispatch(librarySlice.actions.setActiveTextIndex(parseInt(textindex)));
    }
  }, [inputDiv, textindex]);

  const focus = () => {
    if (!quillRef.current) return;

    // @ts-ignore
    const editor = quillRef.current.getEditor();
    editor.focus();

    dispatch(librarySlice.actions.updateTab({ chapterid, textIndex: index }));
  };
  const handleTextChange = (value) => {
    if (!quillRef.current) return;
    if (!edited) return;
    // @ts-ignore
    const editor = quillRef.current.getEditor();
    dispatch(librarySlice.actions.setSaved(false));
    // dispatch(librarySlice.actions.setContents(editor.getContents()));
    dispatch(librarySlice.actions.setText({ index, text: editor.getText() }));
  };

  const setSelection = (e) => {
    if (!quillRef.current) return;
    // @ts-ignore
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();

    if (range) {
      const word = quill.getText(range.index, range.length).trim();
      dispatch(
        librarySlice.actions.setSelectedText({
          index: range.index,
          length: range.length,
          contents: word,
        })
      );
    } else {
      dispatch(librarySlice.actions.clearSelectedText());
    }
  };

  function setOpen(bool: boolean) {
    if (bool) {
      dispatch(librarySlice.actions.openBlock(index));
    } else {
      dispatch(librarySlice.actions.closeBlock(index));
    }
  }

  function addQuotes(leftQuote, _rightQuote: null | undefined | string = null) {
    const rightQuote = _rightQuote || leftQuote;
    if (!quillRef.current) return;
    // @ts-ignore
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (range) {
      quill.insertText(range.index, leftQuote, "user");
      quill.insertText(range.index + range.length + 1, rightQuote, "user");
      quill.setSelection(
        range.index - leftQuote.length + 1,
        range.length + leftQuote.length + rightQuote.length
      );
    }
  }

  function prepend(char: string) {
    if (!quillRef.current) return;
    // @ts-ignore
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (range) {
      const text = quill.getText(range.index, range.length);
      const newText = text
        .split("\n")
        .map((line) => char + line)
        .join("\n");
      quill.deleteText(range.index, range.length, "user");
      quill.insertText(range.index, newText, "user");
      quill.setSelection(range.index, newText.length);
    }
  }

  function textIsSelected() {
    if (!quillRef.current) return;
    // @ts-ignore
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();
    if (range) {
      return range.length > 0;
    }
    return false;
  }

  const handleKeyDown = (event) => {
    setEdited(true);

    // @ts-ignore
    const quill = quillRef.current.getEditor();
    const range = quill.getSelection();

    if (event.shiftKey && event.code === "Quote" && textIsSelected()) {
      event.preventDefault();
      addQuotes('"');
    } else if (event.code === "Quote" && textIsSelected()) {
      event.preventDefault();
      addQuotes("'");
    } else if (
      event.shiftKey &&
      event.code === "Backquote" &&
      textIsSelected()
    ) {
      event.preventDefault();
      addQuotes("~");
    } else if (event.code === "Backquote" && textIsSelected()) {
      event.preventDefault();
      addQuotes("`");
    } else if (
      event.shiftKey &&
      (event.code === "BracketLeft" || event.code === "BracketRight") &&
      textIsSelected()
    ) {
      event.preventDefault();
      addQuotes("{", "}");
    } else if (
      (event.code === "BracketLeft" || event.code === "BracketRight") &&
      textIsSelected()
    ) {
      event.preventDefault();
      addQuotes("[", "]");
    } else if (
      ((event.shiftKey && event.code === "Digit9") ||
        event.code === "Digit0") &&
      textIsSelected()
    ) {
      event.preventDefault();
      addQuotes("(", ")");
    } else if (
      ((event.shiftKey && event.code === "Comma") ||
        (event.shiftKey && event.code === "Period")) &&
      textIsSelected()
    ) {
      event.preventDefault();
      addQuotes("<", ">");
    } else if (event.shiftKey && event.code === "Digit8" && textIsSelected()) {
      event.preventDefault();
      addQuotes("*");
    } else if (event.code === "Minus" && textIsSelected()) {
      event.preventDefault();
      prepend("-");
    } else if (event.code === "Space" && textIsSelected()) {
      event.preventDefault();
      prepend(" ");
    } else if (event.code === "Tab" && textIsSelected()) {
      event.preventDefault();
      prepend("\t");
    } else if (
      event.code === "Enter" ||
      event.code === "ArrowDown" ||
      event.code === "ArrowUp" ||
      event.code === "ArrowLeft" ||
      event.code === "ArrowRight"
    ) {
      formatMarkdown();
    }

    if (event.altKey && event.shiftKey) {
      //    dispatch(librarySlice.actions.setText({ index, text: editor.getText() }));

      if (event.code === "ArrowDown" || event.code === "ArrowUp") {
        event.preventDefault();
        dispatch(librarySlice.actions.extractBlock());
        // @ts-ignore
        window.plausible("keyboard-shortcut-extract-block");
      }
    } else if (event.shiftKey && event.code === "Tab") {
      event.preventDefault();
      setOpen(false);
      // @ts-ignore
      window.plausible("keyboard-shortcut-close-block");
    } else if (event.code === "ArrowDown") {
      if (quillRef && quillRef.current) {
        // @ts-ignore
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection();
        /*  console.log(
          range,
          currentText.text,
          currentText.text.trim().length,
          currentChapterTextLength
        ); */
        if (range) {
          if (
            range.length === 0 &&
            range.index >= currentText.text.trim().length &&
            index < currentChapterTextLength - 1
          ) {
            event.preventDefault();
            dispatch(librarySlice.actions.gotoNextOpenBlock());
          }
        }
      }
    } else if (event.code === "ArrowUp") {
      if (quillRef && quillRef.current) {
        // @ts-ignore
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection();

        if (range) {
          if (range.length === 0 && range.index === 0 && index > 0) {
            event.preventDefault();
            const div = document.getElementById("editDiv");
            if (div) {
              dispatch(librarySlice.actions.setScrollTo(div.scrollTop));
            }

            dispatch(librarySlice.actions.gotoPreviousOpenBlock());
          }
        }
      }
    } else if (event.code === "Backspace") {
      if (quillRef && quillRef.current) {
        // @ts-ignore
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection();

        if (range.index === 0) {
          if (
            currentText &&
            !hasVersions(currentText) &&
            currentText.text.trim().length === 0
          ) {
            event.preventDefault();
            dispatch(librarySlice.actions.deleteBlock(index));
            /* } else {
            dispatch(librarySlice.actions.mergeBlockUp(index)); */
          }
        }
      }
    } /* else {
      highlightForFocusMode();
    } */
  };

  /* const handleKeyDownWhenClosed = (event) => {
    if (open) return;
    if (!isActive) return;
    if (event.key === "Tab") {
      event.preventDefault();
      setOpen(true);
    } else if (event.code === "ArrowDown") {
      if (index < currentChapterTextLength - 1) {
        dispatch(librarySlice.actions.setActiveTextIndex(index + 1));
      }
    } else if (event.code === "ArrowUp") {
      if (index > 0) {
        dispatch(librarySlice.actions.setActiveTextIndex(index - 1));
      }
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDownWhenClosed);

    return () => {
      document.removeEventListener("keydown", handleKeyDownWhenClosed);
    };
  }, [handleKeyDownWhenClosed]); */

  let textPreview = "(no text)";
  if (currentText.text) {
    const line = currentText.text.split("\n")[0];
    const textLines = line.split(".");
    if (textLines.length > 1) {
      textPreview = `${textLines[0]}.`;
    } else {
      textPreview = line;
    }
  }

  textPreview = textPreview.substring(0, 200);

  let borderColor = colors.borderColor;
  if (isActive) borderColor = colors.selectedBorderColor;
  //if (highlight) borderColor = "border-green-400";

  let textColor = "text-gray-300 dark:text-gray-500";
  if (isActive) textColor = "text-gray-500 dark:text-gray-400";

  /*  if (viewMode === "readonly") {
    return (
      <div className={`typography ${fontClass} ${fontSizeClass} mx-xl px-md`}>
        <pre className={`typography ${fontClass}`}>
          {currentText.text.trim()}
        </pre>
      </div>
    );
  } */

  if (currentText.type === "embeddedText") return null;

  const blockColorBorders = {
    red: "border-red-400",
    green: "border-green-400",
    blue: "border-blue-400",
    yellow: "border-yellow-400",
    none: "",
  };

  let blockColorBorder = "";
  if (currentText.blockColor && currentText.blockColor !== "none") {
    blockColorBorder =
      "border-l-2 " + blockColorBorders[currentText.blockColor];
  }

  return (
    <div className="">
      {/* h-full"> */}
      {/*       <div className="ql-editor hidden">hi</div>
      <div className="ql-toolbar ql-snow hidden">hi</div>
 */}
      <div className="mb-sm h-full w-full scroll-mt-lg" ref={inputDiv}>
        {open && (
          <div className="flex relative">
            <div
              className={`hidden md:inline-block absolute -left-10 top-10 text-sm mr-xs w-4 md:w-16 ${textColor}`}
            >
              {currentText.caption}
            </div>

            <div className="hidden md:inline-block md:flex-grow">
              <div
                className="h-5 cursor-pointer mr-sm mt-1"
                onClick={() => {
                  setOpen(false);
                }}
                data-selector={`close-${index}`}
              >
                <ChevronDownIcon
                  className={`w-5 h-5 ${
                    isActive ? "text-gray-400" : "text-gray-500"
                  }`}
                />
              </div>

              {currentText.hideInExport && (
                <EyeSlashIcon className="w-5 h-5 text-gray-500" />
              )}
            </div>

            <div
              className={`flex-grow w-full px-0 xl:pl-sm xl:pr-md ${blockColorBorder} `}
              onClick={() => {
                dispatch(librarySlice.actions.clearCachedSelectedText());
              }}
              data-selector={`texteditor-${index}`}
            >
              <ReactQuill
                ref={quillRef}
                placeholder=""
                className={`${
                  currentText.type === "code" ? "font-mono" : fontClass
                } ${fontSizeClass}`}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
                onChangeSelection={setSelection}
                onFocus={() => {
                  dispatch(librarySlice.actions.setActiveTextIndex(index));
                  if (viewMode === "focus") {
                    highlightForFocusMode();
                  }
                }}
                scrollingContainer="#editDiv"
                modules={{
                  history: {
                    userOnly: true,
                  },
                  toolbar: false,
                }}
                formats={formats}
              />
            </div>
          </div>
        )}
        {!open && (
          <div
            className={`flex relative 
              
            `}
          >
            {/* <div
              className={`hidden md:inline-block absolute -left-20 top-0 text-sm mr-xs w-4 md:w-16 ${textColor}`}
            >
              {currentText.caption}
            </div> */}
            <div className="md:grid grid-cols-1 hidden">
              <div
                className="flex-none cursor-pointer mr-xs"
                onClick={() => {
                  setOpen(true);
                }}
                data-selector={`open-${index}`}
              >
                <ChevronRightIcon className="w-5 h-5 text-gray-500" />
              </div>

              {/* {currentText.reference && <Tag letter="R" />} */}
              {currentText.hideInExport && (
                <EyeSlashIcon className="mt-xs w-5 h-5 text-gray-500" />
              )}
              {/*   {currentText.type === "code" && (
                <CodeMenu currentText={currentText} index={index} />
              )} */}
            </div>
            <div
              className={`flex-grow grid grid-cols-1 pl-sm`}
              onClick={() => {
                dispatch(librarySlice.actions.setActiveTextIndex(index));
              }}
            >
              <div
                className={`text-sm mb-xs rounded-lg px-xs py-1 w-full ${colors.navBackgroundColor} ${colors.secondaryTextColor}`}
              >
                {currentText.caption}
              </div>
              <p
                className="text-gray-500"
                data-selector={`text-preview-${index}`}
              >
                {textPreview}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TextEditor;

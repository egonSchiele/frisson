import { XMarkIcon } from "@heroicons/react/24/outline";
import React, { useContext, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import BookList from "./BookList";
import ChapterList from "./ChapterList";
import Editor from "./Editor";
import LibErrorBoundary from "./components/LibErrorBoundary";
import LibraryContext from "./LibraryContext";
import { EditorPlaceholder } from "./components/LoadingPlaceholder";
import Nav from "./Nav";
import * as t from "./Types";
import Button from "./components/Button";
import "./globals.css";
import {
  getCompostBookId,
  getSelectedChapter,
  librarySlice,
} from "./reducers/librarySlice";
import { AppDispatch, RootState } from "./store";
import ChatSidebar from "./ChatSidebar";
import SlideTransition from "./components/SlideTransition";
import SpeechSidebar from "./SpeechSidebar";
import OutlineSidebar from "./OutlineSidebar";
import Popup from "./components/Popup";

export default function LibraryDesktop() {
  const state: t.State = useSelector((state: RootState) => state.library);
  const currentChapter = getSelectedChapter({ library: state });
  const compostBookId = useSelector(getCompostBookId);

  const dispatch = useDispatch<AppDispatch>();
  const { bookid, chapterid } = useParams();

  const { settings, newCompostNote } = useContext(
    LibraryContext
  ) as t.LibraryContextType;

  useEffect(() => {
    dispatch(librarySlice.actions.closeRightSidebar());
  }, []);

  const mobile = true;
  const chatOpen = !!(
    state.panels.rightSidebar.open &&
    state.panels.rightSidebar.activePanel === "chat" &&
    state.viewMode !== "focus" &&
    currentChapter
  );
  const speechOpen = !!(
    state.panels.rightSidebar.open &&
    state.panels.rightSidebar.activePanel === "speech" &&
    state.viewMode !== "focus" &&
    currentChapter
  );

  const outlineOpen =
    state.panels.leftSidebar.open &&
    state.panels.leftSidebar.activePanel === "outline" &&
    currentChapter;

  return (
    <>
      {state.error && (
        <div className="bg-red-700 p-2 text-white flex">
          <p className="flex-grow">{state.error}</p>
          <div
            className="cursor-pointer flex-none"
            onClick={() => dispatch(librarySlice.actions.clearError())}
          >
            <XMarkIcon className="w-5 h-5 my-auto" />
          </div>
        </div>
      )}

      <div className="relative h-full w-full">
        {state.popupOpen && state.popupData && (
          <LibErrorBoundary component="popup">
            <Popup {...state.popupData} />
          </LibErrorBoundary>
        )}
        <LibErrorBoundary component="nav">
          <Nav mobile={mobile} bookid={bookid} chapterid={chapterid} />
        </LibErrorBoundary>
        {currentChapter && (
          <LibErrorBoundary component="editor">
            <div
              className="h-full w-full absolute top-0 left-0 bg-editor dark:bg-dmeditor z-0"
              id="editor"
            >
              <EditorPlaceholder loaded={state.booksLoaded}>
                <div className="h-full w-full absolute top-0 left-0 bg-editor dark:bg-dmeditor pt-16 mb-60">
                  <Editor settings={settings} />
                </div>
              </EditorPlaceholder>
            </div>
          </LibErrorBoundary>
        )}

        <div className="flex h-screen">
          {!bookid && (
            <LibErrorBoundary component="book list">
              <div className="h-screen overflow-auto w-full relative pb-safe mt-9">
                <BookList />
                {compostBookId && (
                  <Button
                    onClick={() => newCompostNote()}
                    className="absolute bottom-xl right-md"
                    style="secondary"
                    size="large"
                    rounded={true}
                  >
                    New note
                  </Button>
                )}
              </div>
            </LibErrorBoundary>
          )}
          {bookid && !chapterid && (
            <LibErrorBoundary component="chapter list">
              <div className="w-full h-screen overflow-auto mt-9">
                <ChapterList
                  selectedChapterId={chapterid || ""}
                  mobile={true}
                />
              </div>
            </LibErrorBoundary>
          )}
          <LibErrorBoundary component="chat">
            {chatOpen && (
              <div className={`absolute top-0 right-0 h-screen w-full mt-9`}>
                <ChatSidebar />
              </div>
            )}
          </LibErrorBoundary>

          <LibErrorBoundary component="speech">
            {speechOpen && (
              <div className={`absolute top-0 right-0 h-screen w-full mt-9`}>
                <SpeechSidebar />
              </div>
            )}
          </LibErrorBoundary>

          <LibErrorBoundary component="Outline sidebar">
            {outlineOpen && (
              <div
                className={`w-full absolute top-0 left-0 h-screen overflow-auto mt-9`}
              >
                <OutlineSidebar />
              </div>
            )}
          </LibErrorBoundary>
        </div>
      </div>
    </>
  );
}

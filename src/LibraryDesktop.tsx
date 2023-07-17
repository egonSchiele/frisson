import Home from "./Home";
import ChatSidebar from "./ChatSidebar";
import { ArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import BookEditor from "./BookEditor";
import BookList from "./BookList";
import ChapterList from "./ChapterList";
import DiffViewer from "./DiffViewer";
import Editor from "./Editor";
import FocusMode from "./FocusMode";
import LibErrorBoundary from "./LibErrorBoundary";
import LibraryContext from "./LibraryContext";
import Nav from "./Nav";
import PromptsSidebar from "./PromptsSidebar";
import Sidebar from "./Sidebar";
import * as t from "./Types";
import LibraryLauncher from "./components/LibraryLauncher";
import Popup from "./components/Popup";
import SlideTransition from "./components/SlideTransition";
import "./globals.css";
import * as fd from "./lib/fetchData";
import { useColors, useKeyDown } from "./lib/hooks";
import LoadingPlaceholder, {
  EditorPlaceholder,
  PanelPlaceholder,
} from "./LoadingPlaceholder";
import {
  defaultSettings,
  fetchBooksThunk,
  getChapter,
  getCompostBookId,
  getSelectedBook,
  getSelectedChapter,
  librarySlice,
} from "./reducers/librarySlice";
import { AppDispatch, RootState } from "./store";
import {
  getCsrfToken,
  saveTextToHistory,
  today,
  uniq,
  useInterval,
  useLocalStorage,
} from "./utils";
import BlocksSidebar from "./BlocksSidebar";
import OutlineSidebar from "./OutlineSidebar";
import FocusSidebar from "./FocusSidebar";
import Tabs from "./Tabs";
import EditHistorySidebar from "./EditHistorySidebar";
import DebugSidebar from "./DebugSidebar";
import Help from "./Help";
import SearchSidebar from "./SearchSidebar";
import SpeechSidebar from "./SpeechSidebar";
import EncryptionSidebar from "./EncryptionSidebar";
import ProgressBar from "./ProgressBar";

export default function LibraryDesktop() {
  const state: t.State = useSelector((state: RootState) => state.library);
  const currentChapter = getSelectedChapter({ library: state });
  const compostBookId = useSelector(getCompostBookId);
  const editor = useSelector((state: RootState) => state.library.editor);
  const viewMode = useSelector((state: RootState) => state.library.viewMode);
  const activeTab = useSelector((state: RootState) => state.library.activeTab);
  const openTabs = useSelector((state: RootState) => state.library.openTabs);
  const currentText = currentChapter?.text || [];

  const dispatch = useDispatch<AppDispatch>();
  const { bookid, chapterid } = useParams();

  const addToContents = (text: string) => {
    dispatch(librarySlice.actions.addToContents(text));
  };

  const onLauncherClose = () => {
    dispatch(librarySlice.actions.toggleLauncher());
  };

  const { settings, onTextEditorSave } = useContext(
    LibraryContext
  ) as t.LibraryContextType;

  const mobile = false;

  const fileNavigatorOpen =
    state.panels.leftSidebar.open &&
    state.panels.leftSidebar.activePanel === "filenavigator";

  const promptsOpen =
    state.panels.leftSidebar.open &&
    state.panels.leftSidebar.activePanel === "prompts";

  const blocksOpen =
    state.panels.leftSidebar.open &&
    (state.panels.leftSidebar.activePanel === "blocks" ||
      state.panels.leftSidebar.activePanel === "versions");

  const editHistoryOpen =
    state.panels.leftSidebar.open &&
    state.panels.leftSidebar.activePanel === "editHistory";

  const debugOpen =
    state.panels.leftSidebar.open &&
    state.panels.leftSidebar.activePanel === "debug";

  const searchOpen =
    state.panels.leftSidebar.open &&
    state.panels.leftSidebar.activePanel === "search";

  const outlineOpen =
    state.panels.leftSidebar.open &&
    state.panels.leftSidebar.activePanel === "outline";

  const rightSidebarOpen = !!(
    state.panels.rightSidebar.open &&
    state.panels.rightSidebar.activePanel !== "chat" &&
    state.panels.rightSidebar.activePanel !== "speech" &&
    state.panels.rightSidebar.activePanel !== "encryption" &&
    state.viewMode !== "focus" &&
    currentChapter &&
    !mobile
  );

  const chatOpen = !!(
    state.panels.rightSidebar.open &&
    state.panels.rightSidebar.activePanel === "chat" &&
    state.viewMode !== "focus" &&
    currentChapter
  );

  const encryptionOpen = !!(
    state.panels.rightSidebar.open &&
    state.panels.rightSidebar.activePanel === "encryption" &&
    state.viewMode !== "focus"
  );

  const speechOpen = !!(
    state.panels.rightSidebar.open &&
    state.panels.rightSidebar.activePanel === "speech" &&
    state.viewMode !== "focus" &&
    currentChapter
  );

  return (
    <>
      {state.launcherOpen && (
        <LibErrorBoundary component="launcher">
          <LibraryLauncher onLauncherClose={onLauncherClose} />
        </LibErrorBoundary>
      )}
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
      {state.info && (
        <div className="bg-green-700 p-2 text-white flex">
          <p className="flex-grow">{state.info}</p>
          <div
            className="cursor-pointer flex-none"
            onClick={() => dispatch(librarySlice.actions.clearInfo())}
          >
            <XMarkIcon className="w-5 h-5 my-auto" />
          </div>
        </div>
      )}
      {window.scrollY > 5 && (
        <div
          className={`fixed bottom-0 right-0 mr-4 mb-4 cursor-pointer text-gray-200 z-50 p-sm rounded-md active:scale-75 ${
            state.error ? "bg-red-700" : "bg-blue-700"
          }`}
          onClick={() => {
            window.scrollTo(0, 0);
          }}
        >
          <ArrowUpIcon className="w-8 h-8" />
          <p className="w-full text-center">{window.scrollY}</p>
        </div>
      )}

      <div className="relative h-full w-full">
        {state.popupOpen && state.popupData && (
          <LibErrorBoundary component="popup">
            <Popup {...state.popupData} />
          </LibErrorBoundary>
        )}
        {state.helpOpen && (
          <LibErrorBoundary component="help">
            <Help />
          </LibErrorBoundary>
        )}

        {/*  nav */}
        <LibErrorBoundary component="nav">
          <Nav mobile={mobile} bookid={bookid} chapterid={chapterid} />
          <ProgressBar />
        </LibErrorBoundary>
        {/* <LibErrorBoundary component="tabs">
            <Tabs />
          </LibErrorBoundary> */}
        <div
          className="h-full w-full absolute top-0 left-0 bg-editor dark:bg-dmeditor z-0"
          id="editor"
        >
          <div className="h-full w-full">
            {!bookid && !currentChapter && (
              <LibErrorBoundary component="home">
                <EditorPlaceholder loaded={state.booksLoaded}>
                  <div className="h-full w-full absolute top-0 left-96 bg-editor dark:bg-dmeditor pt-16 mb-60">
                    <Home />
                  </div>
                </EditorPlaceholder>
              </LibErrorBoundary>
            )}
          </div>

          <div className="h-full w-full">
            {/* Has to be chapterid and not currentChapter! Otherwise book editor loads and kicks off a save. This bug is now fixed but leaving comment */}
            {bookid && !chapterid && (
              <LibErrorBoundary component="front matter section">
                <EditorPlaceholder loaded={state.booksLoaded}>
                  <div className="h-full w-full absolute top-0 left-108 bg-editor dark:bg-dmeditor pt-16 mb-60">
                    <BookEditor />
                  </div>
                </EditorPlaceholder>
              </LibErrorBoundary>
            )}
          </div>
          {currentChapter && (
            <LibErrorBoundary component="editor">
              <EditorPlaceholder loaded={state.booksLoaded}>
                <div className="h-full w-full absolute top-0 left-0 bg-editor dark:bg-dmeditor pt-16 mb-60">
                  <Editor settings={settings} />
                </div>
              </EditorPlaceholder>
            </LibErrorBoundary>
          )}
        </div>

        <LibErrorBoundary component="book list">
          <PanelPlaceholder
            loaded={true}
            show={state.panels.leftSidebar.open}
            className="top-0 left-0"
          >
            <SlideTransition show={fileNavigatorOpen} direction="left">
              <div
                className={`absolute top-0 left-0 h-full w-48 z-10 mt-9`}
                id="booklist"
              >
                <BookList />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="chapter list">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.leftSidebar.open}
            className={`top-0 left-48`}
          >
            <SlideTransition show={fileNavigatorOpen} direction="left">
              <div className={`absolute top-0 left-48 w-60 h-full z-10 mt-9`}>
                <ChapterList selectedChapterId={chapterid || ""} />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="Prompts sidebar">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.leftSidebar.open}
            className={` top-0 left-0`}
          >
            <SlideTransition show={promptsOpen} direction="left">
              <div
                className={`w-48 absolute top-0 left-0 h-screen overflow-auto  mt-9`}
              >
                <PromptsSidebar
                  closeSidebar={() =>
                    dispatch(librarySlice.actions.closePrompts())
                  }
                  onLoad={() => {
                    dispatch(librarySlice.actions.openRightSidebar());
                    dispatch(
                      librarySlice.actions.setActivePanel("suggestions")
                    );
                  }}
                />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="Blocks sidebar">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.leftSidebar.open}
            className={` top-0 left-0`}
          >
            <SlideTransition show={blocksOpen} direction="left">
              <div
                className={`w-48 absolute top-0 left-0 h-screen overflow-auto mt-9`}
              >
                <BlocksSidebar />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="Edit history sidebar">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.leftSidebar.open}
            className={` top-0 left-0`}
          >
            <SlideTransition show={editHistoryOpen} direction="left">
              <div
                className={`w-48 absolute top-0 left-0 h-screen overflow-auto mt-9`}
              >
                <EditHistorySidebar />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="Debug sidebar">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.leftSidebar.open}
            className={` top-0 left-0`}
          >
            <SlideTransition show={debugOpen} direction="left">
              <div
                className={`w-1/2 absolute top-0 left-0 h-screen overflow-auto mt-9`}
              >
                <DebugSidebar />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="Search sidebar">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.leftSidebar.open}
            className={` top-0 left-0`}
          >
            <SlideTransition show={searchOpen} direction="left">
              <div
                className={`w-96 absolute top-0 left-0 h-screen overflow-auto mt-9`}
              >
                <SearchSidebar />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="Outline sidebar">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.leftSidebar.open}
            className={` top-0 left-0`}
          >
            <SlideTransition show={outlineOpen} direction="left">
              <div
                className={`w-72 absolute top-0 left-0 h-screen overflow-auto mt-9`}
              >
                <OutlineSidebar />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="sidebar">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.rightSidebar.open}
            className="top-0 right-0"
          >
            <SlideTransition show={rightSidebarOpen} direction="right">
              <div
                className={`absolute top-0 right-0 h-screen w-48 md:w-72 lg:w-96 mt-9 z-10`}
              >
                <Sidebar
                  onHistoryClick={async (e, newText) => {
                    await onTextEditorSave(state);
                    dispatch(
                      librarySlice.actions.restoreFromHistory({
                        text: newText,
                        metaKey: e.metaKey,
                      })
                    );
                    dispatch(librarySlice.actions.setViewMode("default"));
                  }}
                  /* TODO */
                  triggerHistoryRerender={0}
                />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="chat">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.rightSidebar.open}
            className="top-0 right-0"
          >
            <SlideTransition show={chatOpen} direction="right">
              <div className={`absolute top-0 right-0 h-screen w-96 mt-9`}>
                <ChatSidebar />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="encryption">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.rightSidebar.open}
            className="top-0 right-0"
          >
            <SlideTransition show={encryptionOpen} direction="right">
              <div className={`absolute top-0 right-0 h-screen w-96 mt-9`}>
                <EncryptionSidebar />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="speech">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.panels.rightSidebar.open}
            className="top-0 right-0"
          >
            <SlideTransition show={speechOpen} direction="right">
              <div className={`absolute top-0 right-0 h-screen w-96 mt-9`}>
                <SpeechSidebar />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>

        <LibErrorBoundary component="focus sidebar">
          <PanelPlaceholder
            loaded={state.booksLoaded}
            show={state.viewMode === "focus"}
            className="top-0 right-0"
          >
            <SlideTransition
              show={state.viewMode === "focus"}
              direction="right"
            >
              <div className={`absolute top-0 right-0 h-screen w-72 mt-9`}>
                <FocusSidebar />
              </div>
            </SlideTransition>
          </PanelPlaceholder>
        </LibErrorBoundary>
      </div>
    </>
  );
}

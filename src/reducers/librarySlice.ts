import { apStyleTitleCase } from "ap-style-title-case";
import * as toolkitRaw from "@reduxjs/toolkit";
import type { AsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import * as t from "../Types";
import {
  decryptObject,
  encryptObject,
  getTags,
  hasVersions,
  isObjectEncrypted,
  isString,
  localStorageOrDefault,
  parseText,
  restoreBlockFromHistory,
  strSplice,
  uniq,
} from "../utils";

import { RootState } from "../store";
import { current } from "immer";

import sortBy from "lodash/sortBy";
import { nanoid } from "nanoid";
import _, { set } from "cypress/types/lodash";
// @ts-ignore
const { createSlice, createAsyncThunk } = toolkitRaw.default ?? toolkitRaw;
function tab(chapterid) {
  return { chapterid };
}
type DefaultChapter = {
  title: string;
  text: t.TextBlock[];
  chapterid: string;
  suggestions: string[];
};

const defaults = {
  title: "",
  text: [t.markdownBlock("a simple default text")],
  chapterid: "",
  suggestions: [],
};

const initialEditorState = (
  _chapter: t.Chapter | DefaultChapter | null
): t.EditorState => {
  const chapter = _chapter || defaults;
  return {
    contents: {},
    activeTextIndex: 0,
    selectedText: { index: 0, length: 0, contents: "" },
  };
};

export const initialState = (_chapter: t.Chapter | null): t.State => {
  const chapter = _chapter || defaults;
  return {
    books: [],
    selectedBookId: null,
    editor: initialEditorState(chapter),
    selectedChapterId: chapter.chapterid,
    infoPanel: { syllables: 0 },
    panels: {
      leftSidebar: {
        open: localStorageOrDefault("leftSidebarOpen", true),
        activePanel: "outline",
      },
      rightSidebar: {
        open: localStorageOrDefault("rightSidebarOpen", false),
        activePanel: localStorageOrDefault("activePanel", "suggestions"),
      },
    },
    suggestions: chapter.suggestions,
    saved: true,
    settingsSaved: true,
    error: "",
    info: "",
    notifications: [],
    loading: true,
    booksLoaded: false,
    viewMode: "default",
    launcherOpen: false,
    popupOpen: false,
    helpOpen: false,
    recording: false,
    popupData: null,
    openTabs: localStorageOrDefault("openTabs", []),
    activeTab: localStorageOrDefault("activeTab", null),
    editHistory: [],
    online: true,
    serviceWorkerRunning: false,
    fromCache: false,
    _triggerSaveAll: false,
    encryptionPassword: null,
    showStructure: localStorageOrDefault("showStructure", false),
  };
};

export const fetchBooksThunk: AsyncThunk<void, null, RootState> =
  createAsyncThunk(
    "library/fetchBooks",
    async (_payload, { dispatch, signal }) => {
      const res = await fetch(`/api/books`, {
        credentials: "include",
        signal,
      });
      //console.log("got res", res);
      const json = await res.json();
      //console.log("got json", json);
      const { books, lastEdited, deepEqual, serviceWorkerRunning, fromCache } =
        json;
      console.log("got books", books, deepEqual, serviceWorkerRunning);

      const isEncrypted = isObjectEncrypted(books);
      if (isEncrypted) {
        const popupData: t.PopupData = {
          title: `Please enter your password to decrypt your books.`,
          inputValue: "",
          cancelable: false,
          opaqueBackground: true,
          type: "password",
          onSubmit: (userEnteredPassword) => {
            dispatch(
              librarySlice.actions.setEncryptionPassword(userEnteredPassword)
            );

            const decryptedBooks = decryptObject(books, userEnteredPassword);

            dispatch(
              librarySlice.actions.setBooks({
                books: decryptedBooks,
                created_at: lastEdited,
              })
            );
          },
        };

        dispatch(librarySlice.actions.showPopup(popupData));
      } else {
        dispatch(
          librarySlice.actions.setBooks({
            books,
            created_at: lastEdited,
          })
        );
      }

      if (deepEqual === false) {
        dispatch(librarySlice.actions.setError("cache books out of date"));
      }
      if (serviceWorkerRunning) {
        dispatch(librarySlice.actions.setServiceWorkerRunning(true));
      }
      if (fromCache) {
        dispatch(librarySlice.actions.setFromCache(true));
      }
    }
  );

export const librarySlice = createSlice({
  name: "library",
  initialState: initialState(null) as t.State,
  reducers: {
    setBooks(
      state: t.State,
      action: PayloadAction<{
        books: t.Book[];
        created_at: number;
      }>
    ) {
      const { books, created_at } = action.payload;
      const decryptedBooks = decryptObject(books, state.encryptionPassword);

      decryptedBooks.forEach((book) => {
        book.chapters.forEach((chapter) => {
          chapter.created_at = created_at;
        });
        book.created_at = created_at;
      });
      state.books = decryptedBooks;
      state.booksLoaded = true;
      state.editor._pushTextToEditor = nanoid();
    },

    setServiceWorkerRunning(state: t.State, action: PayloadAction<boolean>) {
      state.serviceWorkerRunning = action.payload;
    },
    setFromCache(state: t.State, action: PayloadAction<boolean>) {
      state.fromCache = action.payload;
    },
    setTriggerSaveAll(state: t.State, action: PayloadAction<boolean>) {
      state._triggerSaveAll = action.payload;
    },
    setEncryptionPassword(
      state: t.State,
      action: PayloadAction<string | null>
    ) {
      state.encryptionPassword = action.payload;
    },
    setShowStructure(state: t.State, action: PayloadAction<boolean>) {
      state.showStructure = action.payload;
      localStorage.setItem("showStructure", JSON.stringify(action.payload));
    },
    startRecording(state: t.State) {
      state.recording = true;
    },
    stopRecording(state: t.State) {
      state.recording = false;
    },
    setBooksLoaded(state: t.State, action: PayloadAction<boolean>) {
      state.booksLoaded = action.payload;
    },
    newBook(state: t.State, action: PayloadAction<t.Book>) {
      let book = action.payload;
      /* if (state.encryptionPassword !== null) {
        books = encryptObject(books, state.encryptionPassword);
      } */
      state.books.push(book);
    },
    setBook(state: t.State, action: PayloadAction<string | null>) {
      state.selectedBookId = action.payload;
    },
    deleteBook(state: t.State, action: PayloadAction<string>) {
      saveToEditHistory(state, "delete book");
      const bookid = action.payload;
      state.books = state.books.filter((book) => book.bookid !== bookid);
    },
    updateBook(
      state: t.State,
      action: PayloadAction<{ book: t.Book; created_at: number }>
    ) {
      const { book, created_at } = action.payload;
      if (!book) return;

      state.books = state.books.map((b) => {
        if (b.bookid === book.bookid) {
          // This is because save chapter and save book both happen in the same cycle.
          // We are going to update the book but not update its chapters.
          // saveChapter updates the chapter in the redux store.
          // If we include the chapters here, it will overwrite the updates from saveChapter.

          return { ...book, chapters: b.chapters, created_at };
        }
        return b;
      });
    },
    deleteChapter(state: t.State, action: PayloadAction<string>) {
      saveToEditHistory(state, "delete chapter");
      const chapterid = action.payload;
      const book = getSelectedBook({ library: state });
      if (!book) return;
      book.chapters = book.chapters.filter(
        (chapter) => chapter.chapterid !== chapterid
      );
    },
    newChapter(
      state: t.State,
      action: PayloadAction<{ chapter: t.Chapter; bookid: string }>
    ) {
      const { chapter, bookid } = action.payload;
      const book = state.books.find((book) => book.bookid === bookid);
      if (!book) return;
      let decryptedChapter = { ...chapter };
      if (state.encryptionPassword !== null) {
        decryptedChapter = decryptObject(
          decryptedChapter,
          state.encryptionPassword
        );
      }
      book.chapters.push(decryptedChapter);
      book.chapterOrder.push(decryptedChapter.chapterid);
    },
    setChapter(state: t.State, action: PayloadAction<string>) {
      const chapterId = action.payload;
      const chapter = getChapter(chapterId)({ library: state });
      if (!chapter) return;
      state.editor = initialEditorState(chapter);
      state.selectedChapterId = chapterId;
      state.suggestions = chapter.suggestions;
      //state.panels.leftSidebar.open = false;
      //state.panels.chapterList.open = false;
    },
    setNoChapter(state) {
      state.editor = initialEditorState(null);
      state.selectedChapterId = null;
      state.suggestions = [];
    },
    setError(state: t.State, action: PayloadAction<string>) {
      state.error = action.payload;
      state.notifications.push(notification(action.payload, "error"));
    },
    clearError(state: t.State) {
      state.error = "";
    },
    setInfo(state: t.State, action: PayloadAction<string>) {
      state.info = action.payload;
      state.notifications.push(notification(action.payload, "info"));
    },
    clearInfo(state: t.State) {
      state.info = "";
    },
    loading(state) {
      state.loading = true;
    },
    loaded(state) {
      state.loading = false;
    },
    setText(state: t.State, action: PayloadAction<t.NewTextForBlock>) {
      const { index, text } = action.payload;
      console.log("setText", index, text);
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      console.log(chapter.text);
      const block = chapter.text[index];
      if (!block) {
        console.error("No block found for index", index, chapter.chapterid);
      }
      block.text = text;
      state.saved = false;
    },
    setChapterStatus(state: t.State, action: PayloadAction<t.ChapterStatus>) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      chapter.status = action.payload;
      state.saved = false;
    },
    triggerEditorUpdate(state: t.State) {
      // TODO: this doesn't work! why
      state.editor._pushTextToEditor = nanoid();
    },

    pushTextToEditor(state: t.State, action: PayloadAction<t.NewTextForBlock>) {
      const { index, text } = action.payload;
      state.editor._pushTextToEditor = text;
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      chapter.text[index].text = text;

      state.saved = false;
    },
    restoreFromHistory(
      state: t.State,
      action: PayloadAction<{ text: string; metaKey: boolean }>
    ) {
      saveToEditHistory(state, "restore from git history");
      const { text, metaKey } = action.payload;
      const { activeTextIndex } = state.editor;
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      if (metaKey) {
        chapter.text[activeTextIndex].text = text;
      } else {
        const blocks = text.split("\n---\n");
        const newBlocks = blocks.map((blockText) => {
          return restoreBlockFromHistory(blockText);
        });

        chapter.text = newBlocks;
      }
      state.editor._pushTextToEditor = text;
      state.saved = false;
    },
    setTitle(state: t.State, action) {
      const { chapterid, title } = action.payload;
      const chapter = getChapter(chapterid)({ library: state });
      if (!chapter) {
        console.error("No chapter found for id", chapterid);
        return;
      }
      chapter.title = title;

      state.saved = false;
    },
    setAPStyleTitle(state: t.State) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      chapter.title = apStyleTitleCase(chapter.title);

      state.saved = false;
    },
    setBookTitle(state: t.State, action) {
      const book = getSelectedBook({ library: state });
      if (!book) return;
      book.title = action.payload;

      state.saved = false;
    },
    setCoverImageUrl(state: t.State, action) {
      const book = getSelectedBook({ library: state });
      if (!book) return;
      book.coverImageUrl = action.payload;

      state.saved = false;
    },
    setBookSynopsis(state: t.State, action: PayloadAction<string>) {
      const book = getSelectedBook({ library: state });
      if (!book) return;
      // guards against unnecessary save when bookeditor loads
      if (book.synopsis === action.payload) return;
      book.synopsis = action.payload;

      state.saved = false;
    },
    setBookTags(state: t.State, action: PayloadAction<string>) {
      const book = getSelectedBook({ library: state });
      if (!book) return;
      // guards against unnecessary save when bookeditor loads
      if (book.tags === action.payload) return;
      book.tags = action.payload;

      state.saved = false;
    },
    setSuggestions(state: t.State, action: PayloadAction<t.Suggestion[]>) {
      if (action.payload) {
        state.suggestions = action.payload;
        state.saved = false;
      }
    },
    setSaved(state: t.State, action: PayloadAction<boolean>) {
      state.saved = action.payload;
    },
    setSettingsSaved(state: t.State, action: PayloadAction<boolean>) {
      state.settingsSaved = action.payload;
    },
    moveChapter(state: t.State, action: PayloadAction<string>) {
      saveToEditHistory(state, "move chapter");
      const chapter = getSelectedChapter({ library: state });
      const book = getSelectedBook({ library: state });
      if (!book) return;
      if (!chapter) return;
      book.chapterOrder = book.chapterOrder.filter(
        (id) => id !== chapter.chapterid
      );
      book.chapters = book.chapters.filter(
        (c) => c.chapterid !== chapter.chapterid
      );

      const newBookId = action.payload;
      chapter.bookid = newBookId;

      const newBook = state.books.find((b) => b.bookid === newBookId);
      if (newBook) {
        newBook.chapterOrder.unshift(chapter.chapterid);
        newBook.chapters.unshift(chapter);
      }

      state.saved = false;
    },
    setLastTrainedAt(state: t.State, action: PayloadAction<number>) {
      const book = getSelectedBook({ library: state });
      if (!book) return;
      book.lastTrainedAt = action.payload;
      book.chapters.forEach((chapter) => {
        chapter.embeddingsLastCalculatedAt = action.payload;
      });
      state.saved = false;
    },
    updateChapterSSE(
      state: t.State,
      action: PayloadAction<{ chapter: t.Chapter; created_at: number }>
    ) {
      const { chapter, created_at } = action.payload;
      const book = getSelectedBook({ library: state });
      if (!book || !chapter) return;
      book.chapters = book.chapters.map((c) => {
        if (c.chapterid === chapter.chapterid) {
          return { ...chapter, created_at };
        }

        return c;
      });
      state.saved = true;
      state.editor._pushTextToEditor = nanoid();
    },
    updateTimestampForChapter(
      state: t.State,
      action: PayloadAction<{ chapterid: string; created_at: number }>
    ) {
      const { chapterid, created_at } = action.payload;
      const book = getSelectedBook({ library: state });
      if (!book || !chapterid) return;
      book.chapters = book.chapters.map((chapter) => {
        if (chapter.chapterid === chapterid) {
          return { ...chapter, created_at };
        }
        return chapter;
      });
      state.saved = true;
    },
    updateTimestampForBook(
      state: t.State,
      action: PayloadAction<{ bookid: string; created_at: number }>
    ) {
      const { bookid, created_at } = action.payload;

      state.books = state.books.map((book) => {
        if (book.bookid === bookid) {
          return { ...book, created_at };
        }
        return book;
      });
      state.saved = true;
    },
    updateBookSSE(
      state: t.State,
      action: PayloadAction<{ book: t.Book; created_at: number }>
    ) {
      const { book, created_at } = action.payload;
      if (!book) return;
      state.books = state.books.map((b) => {
        if (b.bookid === book.bookid) {
          return {
            ...book,
            created_at,
            chapters: b.chapters,
            chapterOrder: b.chapterOrder,
          };
        }

        return b;
      });
      state.saved = true;
      //state.editor._pushTextToEditor = nanoid();
    },
    updateChapter(state: t.State, action: PayloadAction<t.Chapter>) {
      // this detects if a chapter was moved to a different book
      const chapter = action.payload;
      const book = getSelectedBook({ library: state });
      if (!book || !chapter) return;

      let bookidChanged = false;
      book.chapters.forEach((c) => {
        if (c.chapterid === chapter.chapterid) {
          if (c.bookid !== chapter.bookid) {
            bookidChanged = true;
          }
        }
      });
      if (bookidChanged) {
        book.chapterOrder = book.chapterOrder.filter(
          (id) => id !== chapter.chapterid
        );
        book.chapters = book.chapters.filter(
          (c) => c.chapterid !== chapter.chapterid
        );
        const newBook = state.books.find((b) => b.bookid === chapter.bookid);
        if (newBook) {
          newBook.chapterOrder.unshift(chapter.chapterid);
          newBook.chapters.unshift(chapter);
        }
      }
    },
    addToContents(state: t.State, action: PayloadAction<string>) {
      saveToEditHistory(state, "add to contents");
      const toAdd = action.payload;
      const { activeTextIndex } = state.editor;
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const currentBlock = chapter.text[activeTextIndex];
      let { index, length, contents } = state.editor.selectedText;
      if (index === 0 && state.editor._cachedSelectedText) {
        index = state.editor._cachedSelectedText.index;
        length = state.editor._cachedSelectedText.length;
        contents = state.editor._cachedSelectedText.contents;
      }
      let newText = "";
      if (index) {
        newText = strSplice(currentBlock.text, index, length, toAdd);
      } else if (
        currentBlock.type === "todoList" ||
        currentBlock.type === "image"
      ) {
        newText = `${currentBlock.text}\n${toAdd}`;
      } else {
        newText = `${currentBlock.text} ${toAdd}`;
      }

      currentBlock.text = newText;
      state.editor._pushTextToEditor = newText;
      state.saved = false;
    },
    setSelectedText(state: t.State, action: PayloadAction<t.SelectedText>) {
      state.editor.selectedText = action.payload;
    },
    clearSelectedText(state) {
      state.editor._cachedSelectedText = state.editor.selectedText;
      state.editor.selectedText = { index: 0, length: 0, contents: "" };
    },
    clearCachedSelectedText(state) {
      state.editor._cachedSelectedText = null;
    },
    setFocusModeChecks(state, action: PayloadAction<t.FormatData[] | null>) {
      state.editor.focusModeChecks = action.payload;
    },
    addSuggestion(
      state: t.State,
      action: PayloadAction<{ label: string; value: string }>
    ) {
      const { label, value } = action.payload;
      state.suggestions.push({
        type: label,
        contents: value,
      });

      /* const chapter = getSelectedChapter({ library: state });
      const index = state.editor.activeTextIndex;
      console.log("addSuggestion", chapter, index);
      if (chapter && index !== null && index !== undefined) {
        const text = chapter.text[index];
        if (text.type !== "embeddedText") {
          text.versions ||= [];
          const id = nanoid();
          text.versions.push({
            id,
            text: value,
            createdAt: Date.now(),
            title: value.substring(0, 10),
          });
          text.diffWith = id;
          text.id = nanoid();
        }
      } */

      state.saved = false;
    },
    deleteSuggestion(state: t.State, action: PayloadAction<number>) {
      state.suggestions.splice(action.payload, 1);
      state.saved = false;
    },
    markSuggestionSavedForLater(state: t.State, action: PayloadAction<number>) {
      const index = action.payload;
      state.suggestions[index].savedForLater = true;
      state.saved = false;
    },
    unmarkSuggestionSavedForLater(
      state: t.State,
      action: PayloadAction<number>
    ) {
      const index = action.payload;
      state.suggestions[index].savedForLater = false;
      state.saved = false;
    },
    setChapterOrder(state: t.State, action: PayloadAction<t.ChapterId[]>) {
      saveToEditHistory(state, "chapter order");
      const ids = action.payload;

      const book = getSelectedBook({ library: state });
      if (!book) return;
      book.chapterOrder = ids;
      state.saved = false;
    },
    setTemporaryFocusModeState(state: t.State, action: PayloadAction<string>) {
      state._temporaryFocusModeState = action.payload;
    },
    triggerFocusModeRerender(state: t.State) {
      state.editor._triggerFocusModeRerender =
        state.editor._triggerFocusModeRerender || 0;
      state.editor._triggerFocusModeRerender++;
    },
    setViewMode(state: t.State, action: PayloadAction<t.ViewMode>) {
      state.viewMode = action.payload;
    },
    toggleViewMode(state: t.State, action: PayloadAction<t.ViewMode>) {
      if (state.viewMode === action.payload) {
        state.viewMode = "default";
      } else {
        state.viewMode = action.payload;
      }
    },
    setScrollTo(state: t.State, action: PayloadAction<number>) {
      state.scrollTo = action.payload;
    },
    openFileNavigator(state: t.State) {
      state.viewMode = "default";
      state.panels.leftSidebar.open = true;
      state.panels.leftSidebar.activePanel = "filenavigator";
      localStorage.setItem("leftSidebarOpen", "true");
    },
    closeFileNavigator(state: t.State) {
      state.panels.leftSidebar.open = false;
      localStorage.setItem("leftSidebarOpen", "false");
    },
    openLeftSidebar(state: t.State) {
      state.viewMode = "default";
      state.panels.leftSidebar.open = true;
      localStorage.setItem("leftSidebarOpen", "true");
    },
    closeLeftSidebar(state: t.State) {
      state.panels.leftSidebar.open = false;
      localStorage.setItem("leftSidebarOpen", "false");
    },
    openRightSidebar(state: t.State) {
      state.viewMode = "default";
      state.panels.rightSidebar.open = true;
      localStorage.setItem("rightSidebarOpen", "true");
    },
    closeRightSidebar(state: t.State) {
      state.panels.rightSidebar.open = false;
      localStorage.setItem("rightSidebarOpen", "false");
    },
    /*   closePrompts(state:t.State) {
      state.panels.prompts.open = false;
      localStorage.setItem("promptsOpen", "false");
    }, */
    toggleFileNavigator(state: t.State) {
      toggleBase(state, "filenavigator");
    },
    togglePrompts(state: t.State) {
      toggleBase(state, "prompts");
    },
    toggleBlocks(state: t.State) {
      toggleBase(state, "blocks");
    },
    toggleVersions(state: t.State) {
      toggleBase(state, "versions");
    },
    toggleOutline(state: t.State) {
      toggleBase(state, "outline");
    },
    toggleEditHistory(state: t.State) {
      toggleBase(state, "editHistory");
    },
    toggleDebug(state: t.State) {
      toggleBase(state, "debug");
    },
    toggleSearch(state: t.State) {
      toggleBase(state, "search");
    },
    togglePublish(state: t.State) {
      toggleBase(state, "publish");
    },
    toggleExport(state: t.State) {
      toggleBase(state, "export");
    },
    toggleRightSidebar(state: t.State) {
      state.viewMode = "default";
      if (state.panels.rightSidebar.activePanel !== "chat") {
        state.panels.rightSidebar.open = !state.panels.rightSidebar.open;
      } else {
        state.panels.rightSidebar.open = true;
        state.panels.rightSidebar.activePanel = "info";
      }
      localStorage.setItem(
        "rightSidebarOpen",
        state.panels.rightSidebar.open ? "true" : "false"
      );
    },
    /*     togglePrompts(state:t.State) {
      state.panels.prompts.open = !state.panels.prompts.open;
      localStorage.setItem(
        "promptsOpen",
        state.panels.prompts.open ? "true" : "false"
      );
    }, */
    showVersionsPanel(state: t.State) {
      state.panels.leftSidebar.open = true;
      state.panels.leftSidebar.activePanel = "versions";

      localStorage.setItem("leftSidebarOpen", "true");
    },
    closeAllPanels(state: t.State) {
      const panels = current(state.panels);
      state._cachedPanelState = { ...panels };
      state.panels.leftSidebar.open = false;
      state.panels.rightSidebar.open = false;
      localStorage.setItem("leftSidebarOpen", "false");
      localStorage.setItem("rightSidebarOpen", "false");
    },
    openAllPanels(state: t.State) {
      state.viewMode = "default";
      if (state._cachedPanelState) {
        state.panels = { ...state._cachedPanelState };
      } else {
        state.panels.leftSidebar.open = true;
        state.panels.rightSidebar.open = true;
      }
      state._cachedPanelState = null;
      localStorage.setItem(
        "leftSidebarOpen",
        String(state.panels.leftSidebar.open)
      );
      localStorage.setItem(
        "rightSidebarOpen",
        String(state.panels.rightSidebar.open)
      );
    },
    openOnlyPanel(state, action: PayloadAction<string>) {
      // TODO
      /*  const bookListOpen = action.payload === "bookList";
      const chapterListOpen = action.payload === "chapterList";
      const sidebarOpen = action.payload === "sidebar";
      const promptsOpen = action.payload === "prompts";

      state.panels.leftSidebar.open = bookListOpen;
      state.panels.chapterList.open = chapterListOpen;
      state.panels.sidebar.open = sidebarOpen;
      state.panels.prompts.open = promptsOpen;

      localStorage.setItem("leftSidebarOpen", bookListOpen.toString());
      localStorage.setItem("chapterListOpen", chapterListOpen.toString());
      localStorage.setItem("sidebarOpen", sidebarOpen.toString());
      localStorage.setItem("promptsOpen", promptsOpen.toString()); */
    },
    setActivePanel(state: t.State, action: PayloadAction<t.ActivePanel>) {
      state.viewMode = "default";
      state.panels.rightSidebar.activePanel = action.payload;
      state.panels.rightSidebar.open = true;
      localStorage.setItem("activePanel", action.payload);
    },
    toggleChat(state: t.State) {
      toggleRightSidebarBase(state, "chat");
    },
    toggleSpeech(state: t.State) {
      toggleRightSidebarBase(state, "speech");
    },
    toggleEncryption(state: t.State) {
      toggleRightSidebarBase(state, "encryption");
    },
    toggleLauncher(state: t.State) {
      state.launcherOpen = !state.launcherOpen;
    },
    hidePopup(state: t.State) {
      state.popupOpen = false;
    },
    showPopup(state, action: PayloadAction<t.PopupData>) {
      state.popupOpen = true;
      state.popupData = action.payload;
    },
    toggleHelp(state: t.State) {
      state.helpOpen = !state.helpOpen;
    },
    noBookSelected(state: t.State) {
      state.selectedBookId = null;
      state.selectedChapterId = null;
    },
    noChapterSelected(state: t.State) {
      state.selectedChapterId = null;
    },
    setActiveTextIndex(state: t.State, action: PayloadAction<number>) {
      state.editor.activeTextIndex = action.payload;
    },
    gotoNextOpenBlock(state: t.State) {
      if (
        state.editor.activeTextIndex === null ||
        state.editor.activeTextIndex === undefined
      ) {
        state.editor.activeTextIndex = 0;
      } else {
        const index = state.editor.activeTextIndex;
        const chapter = getSelectedChapter({ library: state });
        if (!chapter) return;
        const nextTexts = chapter.text.slice(index + 1);
        const nextOpenText = nextTexts.find((text) => text.open);
        if (nextOpenText) {
          state.editor.activeTextIndex = chapter.text.indexOf(nextOpenText);
        }
      }
      state.saved = false;
    },
    gotoPreviousOpenBlock(state: t.State) {
      if (
        state.editor.activeTextIndex === null ||
        state.editor.activeTextIndex === undefined
      ) {
        state.editor.activeTextIndex = 0;
      } else {
        const index = state.editor.activeTextIndex;
        const chapter = getSelectedChapter({ library: state });
        if (!chapter) return;
        const prevTexts = chapter.text.slice(0, index);
        const prevOpenText = prevTexts.reverse().find((text) => text.open);

        if (prevOpenText) {
          state.editor.activeTextIndex = chapter.text.indexOf(prevOpenText);
        }
      }
      state.editor._pushSelectionToEditor = {
        index: -1,
        length: 0,
        contents: "",
      };
      state.saved = false;
    },
    setSelection(
      state: t.State,
      payload: PayloadAction<{ index: number; length: number }>
    ) {
      const { index, length } = payload.payload;
      state.editor._pushSelectionToEditor = {
        index,
        length,
      };
    },
    clearPushSelectionToEditor(state: t.State) {
      delete state.editor._pushSelectionToEditor;
    },

    setLanguage(
      state: t.State,
      action: PayloadAction<{ index: number; language: string }>
    ) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index, language } = action.payload;

      const block = chapter.text[index] as t.CodeBlock;

      block.type = "code";
      block.language = language;
      state.saved = false;
    },
    setDisplay(
      state: t.State,
      action: PayloadAction<{ index: number; display: t.ImageDisplay }>
    ) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index, display } = action.payload;

      const block = chapter.text[index] as t.ImageBlock;

      block.type = "image";
      block.display = display;
      state.saved = false;
    },
    toggleReference(state: t.State, action: PayloadAction<number>) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const text = chapter.text[action.payload];
      text.reference = !text.reference;
      state.saved = false;
    },
    toggleHideInExport(state: t.State, action: PayloadAction<number>) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const text = chapter.text[action.payload];
      text.hideInExport = !text.hideInExport;
      state.saved = false;
    },
    setBlockColor(
      state: t.State,
      action: PayloadAction<{ index: number; blockColor: t.BlockColor }>
    ) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index, blockColor } = action.payload;
      const text = chapter.text[index];
      if (text.type === "embeddedText") return;
      text.blockColor = blockColor;
      state.saved = false;
    },
    cycleBlockColor(state: t.State, action: PayloadAction<{ index: number }>) {
      const chapter = getSelectedChapter({ library: state });
      console.log("cycleBlockColor", chapter);
      if (!chapter) return;
      const { index } = action.payload;
      const text = chapter.text[index];
      console.log(">>>", index);
      if (text.type === "embeddedText") return;
      const currentColor = current(text).blockColor;

      const nexts: any = {
        red: "blue",
        blue: "green",
        green: "yellow",
        yellow: "none",
        none: "red",
      };

      text.blockColor = nexts[currentColor];

      if (text.blockColor === undefined) {
        text.blockColor = "red";
      }
      console.log(text.blockColor, index, currentColor, nexts[currentColor]);
      state.saved = false;
    },
    resetBlockColor(state: t.State, action: PayloadAction<{ index: number }>) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index } = action.payload;
      const text = chapter.text[index];
      if (text.type === "embeddedText") return;

      text.blockColor = "none";
      state.saved = false;
    },
    markBlockAsReference(state: t.State, action: PayloadAction<number>) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      chapter.text[action.payload].reference = true;
      state.saved = false;
    },
    unmarkBlockAsReference(state: t.State, action: PayloadAction<number>) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      chapter.text[action.payload].reference = false;
      state.saved = false;
    },
    setBlockType(
      state: t.State,
      action: PayloadAction<{ index: number; type: t.BlockType }>
    ) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index, type } = action.payload;
      chapter.text[index].type = type;
      state.saved = false;
    },
    openBlock(state: t.State, action: PayloadAction<number>) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      chapter.text[action.payload].open = true;
      chapter.text[action.payload].id = nanoid();
      state.saved = false;
    },
    closeBlock(state: t.State, action: PayloadAction<number>) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      chapter.text[action.payload].open = false;
      chapter.text[action.payload].id = nanoid();
      state.saved = false;
    },
    newBlockBeforeCurrent(state: t.State) {
      const newBlock = newBlockFromCurrent(state);
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      if (!newBlock) return;
      chapter.text.splice(state.editor.activeTextIndex, 0, newBlock);

      state.saved = false;
    },

    addVersion(
      state: t.State,
      action: PayloadAction<{
        index: string;
        text?: string;
        setDiffWith?: boolean;
      }>
    ) {
      saveToEditHistory(state, "add version");
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index, text, setDiffWith } = action.payload;
      const block = chapter.text[index];
      const chap = current(chapter);
      const id = nanoid();
      block.versions ||= [];

      if (setDiffWith) {
        block.versions.push({
          id,
          text: text || "",
          createdAt: Date.now(),
          title: (text || "").substring(0, 10),
        });

        block.id = nanoid();

        block.diffWith = id;
      } else {
        block.versions.push({
          id,
          text: block.text,
          createdAt: Date.now(),
          title: block.text.substring(0, 10),
        });
        block.text = text || "";
        block.id = nanoid();
      }

      state.saved = false;
    },
    switchVersion(
      state: t.State,
      action: PayloadAction<{ index: number; versionid: string }>
    ) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index, versionid } = action.payload;
      const block = chapter.text[index];
      if (block.type === "embeddedText") return;
      if (!block.versions) return;
      if (!block.text.match(/^\s*$/)) {
        block.versions.push({
          id: nanoid(),
          text: block.text,
          createdAt: Date.now(),
          title: block.text.substring(0, 10),
        });
      }
      block.text = block.versions.find((v) => v.id === versionid)?.text || "";
      block.versions = block.versions.filter((v) => v.id !== versionid);
      block.diffWith = null;
      block.id = nanoid();

      state.saved = false;
    },
    deleteVersion(
      state: t.State,
      action: PayloadAction<{ index: number; versionid: string }>
    ) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index, versionid } = action.payload;
      const block = chapter.text[index];
      if (block.type === "embeddedText") return;
      if (!block.versions) return;
      saveToEditHistory(state, "delete version");
      block.versions = block.versions.filter((v) => v.id !== versionid);
      block.id = nanoid();

      state.saved = false;
    },
    deleteAllVersions(
      state: t.State,
      action: PayloadAction<{ index: number }>
    ) {
      saveToEditHistory(state, "delete all versions");
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index } = action.payload;
      const block = chapter.text[index];
      if (block.type === "embeddedText") return;
      block.versions = [];
      block.diffWith = null;
      block.id = nanoid();

      state.saved = false;
    },
    setDiffWith(
      state: t.State,
      action: PayloadAction<{ index: number; diffWith: string }>
    ) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index, diffWith } = action.payload;
      const block = chapter.text[index];
      if (block.type === "embeddedText") return;
      block.diffWith = diffWith;
      block.id = nanoid();

      state.saved = false;
    },
    toggleShowAllVersions(
      state: t.State,
      action: PayloadAction<{ index: number }>
    ) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index } = action.payload;
      const block = chapter.text[index];
      if (block.type === "embeddedText") return;
      block.showAllVersions = !block.showAllVersions;

      state.saved = false;
    },
    addCaption(
      state: t.State,
      action: PayloadAction<{ index: number; caption: string }>
    ) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index, caption } = action.payload;
      const block = chapter.text[index];

      block.caption = caption;
      block.id = nanoid();

      state.saved = false;
    },
    newBlockAfterCurrent(state: t.State) {
      const newBlock = newBlockFromCurrent(state);
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      if (!newBlock) return;
      chapter.text.splice(state.editor.activeTextIndex + 1, 0, newBlock);
      state.editor.activeTextIndex += 1;

      state.saved = false;
    },
    mergeBlockUp(state: t.State, action: PayloadAction<number | null>) {
      saveToEditHistory(state, "merge block up");
      const index = action.payload || state.editor.activeTextIndex;
      if (index === 0) return;
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const cur = chapter.text[index];
      const prev = chapter.text[index - 1];
      prev.text += `\n${cur.text}`;
      cur.text = "";
      chapter.text.splice(index, 1);
      prev.id = nanoid();

      state.saved = false;
    },
    mergeBlockDown(state: t.State, action: PayloadAction<number | null>) {
      saveToEditHistory(state, "merge block down");
      const index = action.payload || state.editor.activeTextIndex;
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      if (index === chapter.text.length - 1) return;
      const cur = chapter.text[index];
      const next = chapter.text[index + 1];
      cur.text += `\n${next.text}`;
      chapter.text.splice(index + 1, 1);
      cur.id = nanoid();

      state.saved = false;
    },
    mergeBlockSurrounding(
      state: t.State,
      action: PayloadAction<number | null>
    ) {
      saveToEditHistory(state, "merge with surrounding blocks");
      const index = action.payload || state.editor.activeTextIndex;
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      if (index === chapter.text.length - 1) return;
      const cur = chapter.text[index];
      const next = chapter.text[index + 1];
      const prev = chapter.text[index - 1];
      prev.text += `\n${cur.text}\n${next.text}`;
      cur.text = "";
      chapter.text.splice(index, 2);
      prev.id = nanoid();

      state.saved = false;
    },
    deleteBlock(state: t.State, action: PayloadAction<number>) {
      saveToEditHistory(state, "delete block");
      const index = action.payload;
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      if (chapter.text.length === 1) return;
      let newActiveIndex = index;
      if (index !== 0) {
        newActiveIndex = index - 1;
      }
      state.editor.activeTextIndex = newActiveIndex;
      chapter.text.splice(index, 1);
      state.saved = false;
    },
    moveBlock(
      state: t.State,
      action: PayloadAction<{ sourceIndex: number; destinationIndex: number }>
    ) {
      saveToEditHistory(state, "move block");
      const { sourceIndex, destinationIndex } = action.payload;
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      if (chapter.text.length === 1) return;
      if (
        sourceIndex < 0 ||
        sourceIndex >= chapter.text.length ||
        destinationIndex < 0 ||
        destinationIndex >= chapter.text.length ||
        sourceIndex === destinationIndex
      )
        return;

      const [removed] = chapter.text.splice(sourceIndex, 1);
      chapter.text.splice(destinationIndex, 0, removed);
      state.saved = false;
    },
    extractBlock(state: t.State) {
      saveToEditHistory(state, "extract block");
      let { index, length, contents } = state.editor.selectedText;
      if (
        length === 0 &&
        state.editor._cachedSelectedText &&
        state.editor._cachedSelectedText.length > 0
      ) {
        index = state.editor._cachedSelectedText.index;
        length = state.editor._cachedSelectedText.length;
        contents = state.editor._cachedSelectedText.contents;
      }
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const text = chapter.text[state.editor.activeTextIndex];

      if (length === 0) {
        if (index === 0) {
          // newBlockBeforeCurrent
          const newBlock = newBlockFromCurrent(state);
          if (!newBlock) return;
          chapter.text.splice(state.editor.activeTextIndex, 0, newBlock);
          const cur = current(chapter.text);

          return;
        } else if (index === text.text.length - 1) {
          // newBlockAfterCurrent
          const newBlock = newBlockFromCurrent(state);
          if (!newBlock) return;

          chapter.text.splice(state.editor.activeTextIndex + 1, 0, newBlock);
          state.editor.activeTextIndex += 1;
          state.saved = false;
          return;
        } else {
          return;
        }
      }
      const newText = strSplice(text.text, index, length).trim();
      const newBlock = newBlockFromCurrent(state, contents.trim());
      if (!newBlock) return;
      // all the text before the selection
      const startText = text.text.slice(0, index).trim();
      // all the text after the selection
      const endText = text.text.slice(index + length).trim();

      state.saved = false;
      if (index === 0) {
        if (length === text.text.length) {
          console.log("all");
          // we selected the entire text
        } else {
          console.log("start-nowhitespace");
          // we selected the beginning of the text,
          // so new block will be at the start
          text.text = newText;
          state.editor._pushTextToEditor = newText;
          chapter.text.splice(state.editor.activeTextIndex, 0, newBlock);
        }
      } else if (startText.length === 0) {
        console.log("start");
        // just whitespace the beginning of the text,
        // so new block will be at the start
        text.text = newText;
        state.editor._pushTextToEditor = newText;
        chapter.text.splice(state.editor.activeTextIndex, 0, newBlock);
      } else if (endText.length === 0) {
        console.log("end");
        // just whitespace the end of the text,
        // so new block will be at the end
        text.text = newText;
        state.editor._pushTextToEditor = newText;
        chapter.text.splice(state.editor.activeTextIndex + 1, 0, newBlock);
        state.editor.activeTextIndex += 1;
      } else if (index + length === text.text.length) {
        console.log("end-nowhitespace");
        // we selected the end of the text,
        // so new block will be at the end
        text.text = newText;
        state.editor._pushTextToEditor = newText;
        chapter.text.splice(state.editor.activeTextIndex + 1, 0, newBlock);
        state.editor.activeTextIndex += 1;
      } else {
        console.log("middle");
        // we selected the middle of the text,
        // so new block will be in the middle

        // the selected text
        chapter.text.splice(state.editor.activeTextIndex + 1, 0, newBlock);

        text.text = startText;
        state.editor._pushTextToEditor = startText;

        const endBlock = newBlockFromCurrent(state, endText);
        if (!endBlock) return;
        chapter.text.splice(state.editor.activeTextIndex + 2, 0, endBlock);
        state.editor.activeTextIndex += 1;
      }
    },
    addCharacter(state: t.State, action: PayloadAction<string>) {
      const book = getSelectedBook({ library: state });
      if (!book) return;

      if (book.characters) {
        book.characters.push(t.newCharacter());
      } else {
        book.characters = [t.newCharacter()];
      }

      state.saved = false;
    },
    editCharacter(
      state: t.State,
      action: PayloadAction<{ index: number; character: t.Character }>
    ) {
      const book = getSelectedBook({ library: state });
      if (!book) return;
      if (!book.characters) return;
      book.characters[action.payload.index] = action.payload.character;
      state.saved = false;
    },
    deleteCharacter(state: t.State, action: PayloadAction<{ index: number }>) {
      saveToEditHistory(state, "delete character");
      const book = getSelectedBook({ library: state });
      if (!book) return;
      if (!book.characters) return;
      book.characters.splice(action.payload.index, 1);
      state.saved = false;
    },
    setEmbeddedChapter(
      state: t.State,
      action: PayloadAction<{
        index: number;
        bookid: string;
        chapterid: string;
      }>
    ) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      const { index, bookid, chapterid } = action.payload;
      const block = chapter.text[index];
      if (block && block.type === "embeddedText") {
        block.bookid = bookid;
        block.chapterid = chapterid;
      }

      block.id = nanoid();
      state.saved = false;
    },
    newTab(state: t.State, action: PayloadAction<t.Tab>) {
      const index = state.openTabs.findIndex(
        (tab) => tab.chapterid === action.payload.chapterid
      );
      if (index !== -1) {
        state.activeTab = index;
        localStorage.setItem("activeTab", index.toString());
        return;
      }

      state.openTabs.push(action.payload);
      localStorage.setItem("openTabs", JSON.stringify(state.openTabs));

      state.activeTab = state.openTabs.length - 1;
      localStorage.setItem("activeTab", state.activeTab.toString());
    },
    updateTab(state: t.State, action: PayloadAction<t.Tab>) {
      const index = state.openTabs.findIndex(
        (tab) => tab.chapterid === action.payload.chapterid
      );
      if (index === -1) {
        return;
      }
      state.openTabs[index] = action.payload;
      localStorage.setItem("openTabs", JSON.stringify(state.openTabs));
    },
    prevTab(state: t.State) {
      if (state.activeTab === 0) {
        state.activeTab = state.openTabs.length - 1;
      } else {
        state.activeTab -= 1;
      }
      localStorage.setItem("activeTab", state.activeTab.toString());
    },
    nextTab(state: t.State) {
      if (state.activeTab === state.openTabs.length - 1) {
        state.activeTab = 0;
      } else {
        state.activeTab += 1;
      }
      localStorage.setItem("activeTab", state.activeTab.toString());
    },
    closeTab(state: t.State, action: PayloadAction<string | null>) {
      let index = 0;
      if (action.payload === null || action.payload === undefined) {
        index = state.activeTab;
      } else {
        index = state.openTabs.findIndex(
          (tab) => tab.chapterid === action.payload
        );
      }

      if (state.openTabs.length === 0) {
        state.activeTab = null;
        state.selectedChapterId = null;
      } else if (state.activeTab === index) {
        if (state.activeTab < state.openTabs.length - 1) {
          // no change, more tabs after this
          //state.activeTab = 0;
        } else {
          // last one, so move down
          state.activeTab = index - 1;
        }
        //state.selectedChapterId = state.openTabs[state.activeTab].chapterid;
      }
      if (index !== -1) {
        state.openTabs.splice(index, 1);
      }
      localStorage.setItem("activeTab", state.activeTab.toString());
      localStorage.setItem("openTabs", JSON.stringify(state.openTabs));
    },
    closeAllTabs(state: t.State) {
      state.openTabs = [];
      state.activeTab = null;
      localStorage.setItem("activeTab", null);
      localStorage.setItem("openTabs", "[]");
    },
    closeAllOtherTabs(state: t.State) {
      const currentTab = state.openTabs[state.activeTab];
      state.openTabs = [currentTab];
      state.activeTab = 0;
      localStorage.setItem("activeTab", "0");
      localStorage.setItem("openTabs", JSON.stringify(state.openTabs));
    },
    goToTab(state: t.State, action: PayloadAction<string>) {
      const index = state.openTabs.findIndex(
        (tab) => tab.chapterid === action.payload
      );
      if (index !== -1) {
        state.activeTab = index;
      }
      localStorage.setItem("activeTab", state.activeTab.toString());
    },
    togglePinToHome(state: t.State) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      chapter.pinToHome = !chapter.pinToHome;
      state.saved = false;
    },
    togglePublished(state: t.State) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      chapter.published = !chapter.published;
      state.saved = false;
    },
    stripNonAsciiCharacters(state: t.State) {
      const chapter = getSelectedChapter({ library: state });
      if (!chapter) return;
      chapter.text = chapter.text.map((block) => {
        block.text = block.text.replace(/[^\x00-\x7F]/g, "");
        return block;
      });
      state.editor._pushTextToEditor = nanoid();
      state.saved = false;
    },
    restoreFromEditHistory(state: t.State, action: PayloadAction<number>) {
      const historyId = action.payload;
      const prevState = state.editHistory[historyId];

      if (!prevState) return;

      saveToEditHistory(state, "restore from history");

      state.books = prevState.books;
      state.editor._pushTextToEditor = nanoid();
      state.saved = false;
    },
  },
  /* setTab(
    state: t.State,
    action: PayloadAction<{
      chapterid: string;
    }>
  ) {
    const index = state.openTabs.findIndex(
      (tab) => tab === action.payload.chapterid
    );
    if (index !== -1) {
      state.openTabs.splice(index, 1);
    }
    state.openTabs.push(action.payload.chapterid);
  }, */
  extraReducers: (builder) => {
    builder.addCase(fetchBooksThunk.pending, (state) => {
      state.loading = true;
    });

    builder.addCase(fetchBooksThunk.fulfilled, (state) => {
      state.loading = false;
      //state.booksLoaded = true;
    });

    builder.addCase(fetchBooksThunk.rejected, (state) => {
      state.loading = false;
      state.booksLoaded = true;
      state.error = "Books not found";
    });
  },
});

export const getChapterTitles = (bookid) => (state: RootState) => {
  const book = state.library.books.find((book) => book.bookid === bookid);
  if (book) {
    return book.chapters.map((chapter) => chapter.title);
  }
  return [];
};

export const getChapters = (bookid) => (state: RootState) => {
  const book = state.library.books.find((book) => book.bookid === bookid);
  if (book) {
    return book.chapters;
  }
  return [];
};

export const getSelectedBook = (state: RootState): t.Book | null => {
  if (!state.library.booksLoaded) return null;

  const book = state.library.books.find(
    (book) => book.bookid === state.library.selectedBookId
  );

  return book;
};

export const getSelectedChapter = (state: RootState): t.Chapter | null => {
  if (!state.library.booksLoaded) return null;

  const book = getSelectedBook(state);
  if (!book) return null;
  const chapter = book.chapters.find(
    (chapter) => chapter.chapterid === state.library.selectedChapterId
  );

  return chapter || null;
};

export const getSelectedChapterTitle = (state: RootState): string | null => {
  const chapter = getSelectedChapter(state);

  if (!chapter) return null;

  return chapter.title;
};

export const getSelectedChapterTextLength = (
  state: RootState
): number | null => {
  const chapter = getSelectedChapter(state);
  if (!chapter) return null;

  return chapter.text.length;
};

export const getSelectedChapterVisibleTextLength = (
  state: RootState
): number | null => {
  const chapter = getSelectedChapter(state);
  if (!chapter) return null;

  return chapter.text.filter((b) => !b.hideInExport).length;
};

export const getProgress = (state: RootState): number | null => {
  const activeTextIndex = state.library.editor.activeTextIndex;
  if (!activeTextIndex) return null;

  const chapter = getSelectedChapter(state);
  if (!chapter) return null;
  const currentText = chapter.text[activeTextIndex];

  const visibleBlocks = chapter.text.filter((b) => !b.hideInExport);
  const currentTextIndex = visibleBlocks.findIndex((b) => b === currentText);

  return Math.round(((currentTextIndex + 1) / visibleBlocks.length) * 100);
};

export const getCompostBookId = (state: RootState): string | null => {
  const compostBook = state.library.books.find(
    (b: t.Book) => b.tag === "compost"
  );
  if (compostBook) {
    return compostBook.bookid;
  }
  return null;
};

export const getText =
  (index: number) =>
  (state: RootState): t.TextBlock | null => {
    const chapter = getSelectedChapter(state);
    if (!chapter) return null;

    return chapter.text[index];
  };

export const getChapter =
  (chapterid: t.ChapterId) =>
  (state: RootState): t.Chapter | null => {
    if (!state.library.booksLoaded) return null;
    let chapterToReturn = null;
    state.library.books.forEach((book) => {
      book.chapters.forEach((chapter) => {
        if (chapter.chapterid === chapterid) {
          chapterToReturn = chapter;
        }
      });
    });

    return chapterToReturn;
  };

export const getSelectedBookChapters = (
  state: RootState
): t.Chapter[] | null => {
  const book = getSelectedBook(state);

  if (!book) return null;

  const { chapters } = book;

  if (book.tag === "compost") {
    return sortBy(chapters, ["created_at"]).reverse();
  }

  if (book.chapterOrder.length > 0) {
    const sortedChapters: t.Chapter[] = [];
    book.chapterOrder.forEach((id) => {
      const chapter = chapters.find((chapter) => chapter.chapterid === id);
      if (chapter) sortedChapters.push(chapter);
    });
    const sortedByCreated = sortBy(chapters, ["created_at"]);
    sortedByCreated.forEach((chapter) => {
      if (!sortedChapters.includes(chapter)) {
        sortedChapters.push(chapter);
      }
    });
    return sortedChapters;
  }
  return sortBy(chapters, ["created_at"]);
};

export const getNextChapter = (state: RootState): t.Chapter | null => {
  const chapters = getSelectedBookChapters(state);
  const selectedChapter = getSelectedChapter(state);
  if (!chapters) return null;
  if (chapters.length < 2) return null;

  const index = chapters.findIndex(
    (chapter) => selectedChapter.chapterid === chapter.chapterid
  );

  if (index === -1) return null;
  if (chapters.length === 2 && index === 1) return null;
  if (index === chapters.length - 1) return chapters[0];
  return chapters[index + 1];
};

export const getPreviousChapter = (state: RootState): t.Chapter | null => {
  const chapters = getSelectedBookChapters(state);
  const selectedChapter = getSelectedChapter(state);
  if (!chapters) return null;
  if (chapters.length < 2) return null;

  const index = chapters.findIndex(
    (chapter) => selectedChapter.chapterid === chapter.chapterid
  );

  if (index === -1) return null;
  if (chapters.length === 2 && index === 0) return null;
  if (index === 0) return chapters[chapters.length - 1];
  return chapters[index - 1];
};

export const getCharacters = (state: RootState): t.Character[] | null => {
  const book = getSelectedBook(state);

  if (!book) return null;
  return book.characters || null;
};

export const getAllTags = (state: RootState): string[] => {
  const books = state.library.books;
  const tags = uniq(
    books.map((book) => (book.tags ? getTags(book.tags) : [])).flat()
  );
  return tags;
};

export const getOpenTabs = (state: RootState): t.TabStateInfo[] => {
  const openTabs = state.library.openTabs;
  const tabs = openTabs.map((tab) => {
    const chapter = getChapter(tab.chapterid)(state);
    if (!chapter) return null;
    const book = state.library.books.find(
      (book) => book.bookid === chapter.bookid
    );
    if (!book) return null;
    return {
      chapterid: tab.chapterid,
      title: chapter.title,
      bookid: chapter.bookid,
      bookTitle: book.title,
      textIndex: tab.textIndex,
    };
  });
  return tabs.filter((tab) => tab !== null);
};

export function newBlockFromCurrent(
  state: t.State,
  defaultText = ""
): t.TextBlock | null {
  const chapter = getSelectedChapter({ library: state });
  if (!chapter) return null;
  if (
    state.editor.activeTextIndex === null ||
    state.editor.activeTextIndex === undefined
  )
    return null;

  const text = chapter.text[state.editor.activeTextIndex];
  if (text.type === "plain") {
    return t.plainTextBlock(defaultText);
  } else if (text.type === "markdown") {
    return t.markdownBlock(defaultText);
  } else if (text.type === "code") {
    return t.codeBlock(defaultText, text.language || "javascript");
  }
  return null;
}

export const defaultSettings: t.UserSettings = {
  model: "",
  max_tokens: 0,
  num_suggestions: 0,
  theme: "default",
  version_control: false,
  prompts: [],
  design: null,
};

function toggleBase(state: t.State, panel: t.LeftActivePanel) {
  state.viewMode = "default";
  if (
    state.panels.leftSidebar.open &&
    state.panels.leftSidebar.activePanel === panel
  ) {
    state.panels.leftSidebar.open = false;
  } else {
    state.panels.leftSidebar.open = true;
    state.panels.leftSidebar.activePanel = panel;
  }

  localStorage.setItem(
    "leftSidebarOpen",
    state.panels.leftSidebar.open ? "true" : "false"
  );
}

function saveToEditHistory(state: t.State, label: string) {
  const books = state.books;
  state.editHistory.push({
    label,
    books: JSON.parse(JSON.stringify(books)),
    id: nanoid(),
  });
}

function notification(message, type) {
  return {
    type,
    message,
    created_at: Date.now(),
    id: nanoid(),
  };
}

function toggleRightSidebarBase(state, activePanel) {
  state.viewMode = "default";
  if (
    state.panels.rightSidebar.open &&
    state.panels.rightSidebar.activePanel === activePanel
  ) {
    state.panels.rightSidebar.open = false;
  } else {
    state.panels.rightSidebar.activePanel = activePanel;
    state.panels.rightSidebar.open = true;
    localStorage.setItem("activePanel", activePanel);
  }
  localStorage.setItem(
    "rightSidebarOpen",
    String(state.panels.rightSidebar.open)
  );
}

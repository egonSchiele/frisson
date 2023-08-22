import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import DiffViewer from "./DiffViewer";
import LibErrorBoundary from "./components/LibErrorBoundary";
import LibraryContext from "./LibraryContext";
import LibraryDesktop from "./LibraryDesktop";
import LibraryMobile from "./LibraryMobile";
import Sidebar from "./sidebars/Sidebar";
import * as t from "./Types";
import LibraryLauncher from "./components/LibraryLauncher";
import "./globals.css";
import * as fd from "./lib/fetchData";
import { useKeyDown, useSSEUpdates } from "./lib/hooks";
import {
  defaultSettings,
  fetchBooksThunk,
  getChapter,
  getCompostBookId,
  getSelectedBook,
  getSelectedBookTitle,
  getSelectedChapter,
  getSelectedChapterTitle,
  getText,
  librarySlice,
} from "./reducers/librarySlice";
import { AppDispatch, RootState } from "./store";
import {
  encryptMessage,
  encryptObject,
  getCsrfToken,
  textToSaveToHistory,
  setCookie,
  today,
  useInterval,
  useLocalStorage,
} from "./utils";
import { nanoid } from "nanoid";

export default function Library({ mobile = false }) {
  const state: t.State = useSelector((state: RootState) => state.library);
  const currentChapter = getSelectedChapter({ library: state });
  const currentBook = useSelector(getSelectedBook);
  const currentChapterTitle = useSelector(getSelectedChapterTitle);
  const currentBookTitle = useSelector(getSelectedBookTitle);
  const compostBookId = useSelector(getCompostBookId);
  const editor = useSelector((state: RootState) => state.library.editor);
  const viewMode = useSelector((state: RootState) => state.library.viewMode);
  const activeTab = useSelector((state: RootState) => state.library.activeTab);
  const openTabs = useSelector((state: RootState) => state.library.openTabs);
  const textForDiff = useSelector(
    (state: RootState) => state.library.textForDiff
  );
  const currentText = currentChapter?.text || [];
  const currentTextBlock = useSelector(getText(state.editor.activeTextIndex));
  const dispatch = useDispatch<AppDispatch>();
  const [settings, setSettings] = useState<t.UserSettings>(defaultSettings);
  const [usage, setUsage] = useState<t.Usage | null>(null);
  const [triggerHistoryRerender, setTriggerHistoryRerender] = useState(0);
  const encryptionPassword: string | null = useSelector(
    (state: RootState) => state.library.encryptionPassword
  );
  useEffect(() => {
    if (settings.theme === "dark" || settings.theme === "default") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [settings]);

  const { bookid, chapterid, textindex } = useParams();
  const [cachedBooks, setCachedBooks] = useLocalStorage<any>("cachedBooks", []);

  useEffect(() => {
    if (state.booksLoaded) {
      if (chapterid) {
        dispatch(
          librarySlice.actions.newTab({
            tag: "chapter",
            chapterid,
            textIndex: textindex || editor.activeTextIndex,
          })
        );
        dispatch(librarySlice.actions.setChapter(chapterid));
        dispatch(librarySlice.actions.closeFileNavigator());
        // dispatch(librarySlice.actions.closeLeftSidebar());
        //dispatch(librarySlice.actions.toggleOutline());
        return;
      } else if (bookid) {
        dispatch(
          librarySlice.actions.newTab({
            tag: "book",
            bookid,
          })
        );
        document.title = `${currentBookTitle} - Chisel Editor`;
      } else {
        document.title = `Chisel Editor`;
      }
    }
    dispatch(librarySlice.actions.setNoChapter());
  }, [chapterid, state.selectedBookId, state.booksLoaded]);

  useEffect(() => {
    if (currentChapterTitle) {
      document.title = `${currentChapterTitle} - Chisel Editor`;
    }
  }, [currentChapterTitle]);

  useEffect(() => {
    if (state.booksLoaded) {
      /*   setCachedBooks(
        state.books.map((book) => ({
          title: book.title,
          bookid: book.bookid,
          tag: book.tag,
        }))
      );
 */
      async function checkStale() {
        await checkIfStale();
      }
      window.addEventListener("focus", checkStale);
      return () => {
        window.removeEventListener("focus", checkStale);
      };
    }
  }, [state.booksLoaded]);

  useEffect(() => {
    if (bookid) {
      dispatch(librarySlice.actions.setBook(bookid));
    }
  }, [bookid]);

  /* useEffect(() => {
    if (activeTab === -1) {
      navigate("/");
    } else if (activeTab !== null) {
      const tab = state.openTabs[activeTab];
      if (!tab) {
        navigate("/");
        return;
      }
      if (tab.tag === "book") {
        navigate(`/book/${tab.bookid}`);
      } else if (tab.tag === "chapter") {
        const activeChapterId = tab.chapterid;
        state.books.forEach((book) => {
          book.chapters.forEach((chapter) => {
            if (chapter.chapterid === activeChapterId) {
              navigate(
                `/book/${book.bookid}/chapter/${chapter.chapterid}/${
                  tab.textIndex || textindex
                }`
              );
            }
          });
        });
      }
    } else {
      if (!state.selectedChapterId && state.selectedBookId) {
        navigate(`/book/${state.selectedBookId}`);
      }
    }
  }, [activeTab, openTabs]); */

  // if the chapter id is null set the book list open to true
  // so that we do not end up with an empty screen.
  useEffect(() => {
    if (!chapterid) {
      dispatch(librarySlice.actions.openFileNavigator());
    }
  }, [chapterid]);

  // Force the chapter list open if a chapter has not been selected but a
  // book has.
  useEffect(() => {
    if (!chapterid && state.selectedBookId) {
      dispatch(librarySlice.actions.openFileNavigator());
    }
  }, [state.selectedBookId, chapterid]);

  const clientSessionId = sessionStorage.getItem("clientSessionId");

  // TODO handle encryption before enabling
  // This doesn't handle multiple tabs in the same browser.
  useSSEUpdates(setSettings, clientSessionId);

  async function saveAllBooks() {
    setLoading(true);
    const books = state.books;

    books.map(async (book) => {
      const promises = book.chapters.map(async (chapter) => {
        await saveChapter(chapter);
      });
      await Promise.all([...promises, await saveBook(book)]);
    });
    await saveSettings();
    setLoading(false);
  }

  useEffect(() => {
    if (state._triggerSaveAll) {
      saveAllBooks();
      dispatch(librarySlice.actions.setTriggerSaveAll(false));
    }
  }, [state._triggerSaveAll]);

  useKeyDown(async (event) => {
    if (event.metaKey && event.shiftKey && event.code === "KeyS") {
      event.preventDefault();
      onTextEditorSave(state, true);
      // @ts-ignore
      window.plausible("keyboard-shortcut-save-and-add-to-history");
    }
    if (event.metaKey && event.code === "KeyS") {
      event.preventDefault();
      onTextEditorSave(state, false);
      // @ts-ignore
      window.plausible("keyboard-shortcut-save");
    } else if (event.metaKey && event.shiftKey && event.code === "KeyO") {
      event.preventDefault();
      dispatch(librarySlice.actions.toggleFileNavigator());
      // @ts-ignore
      window.plausible("keyboard-shortcut-file-navigator");
    } else if (event.metaKey && event.shiftKey && event.code === "KeyV") {
      event.preventDefault();
      dispatch(librarySlice.actions.toggleVersions());
      // @ts-ignore
      window.plausible("keyboard-shortcut-versions");
    } else if (event.metaKey && event.shiftKey && event.code === "KeyT") {
      event.preventDefault();
      newChapter();
      // @ts-ignore
      window.plausible("keyboard-shortcut-new-chapter");
    } else if (event.metaKey && event.shiftKey && event.code === "KeyX") {
      if (!state.activeTab) return;
      const tab = state.openTabs[state.activeTab];
      if (tab) {
        event.preventDefault();
        dispatch(librarySlice.actions.closeTab(tab));
      }
    } else if (event.metaKey && event.code === "BracketLeft") {
      if (state.editor.activeTextIndex > 0) {
        event.preventDefault();
        dispatch(
          librarySlice.actions.setActiveTextIndex(
            state.editor.activeTextIndex - 1
          )
        );
      }
    } else if (event.metaKey && event.code === "BracketRight") {
      if (state.editor.activeTextIndex < currentChapter.text.length - 1) {
        event.preventDefault();
        dispatch(
          librarySlice.actions.setActiveTextIndex(
            state.editor.activeTextIndex + 1
          )
        );
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (state.popupOpen) {
        dispatch(librarySlice.actions.hidePopup());
      } else if (state.multipleChoicePopupOpen) {
        dispatch(librarySlice.actions.hideMultipleChoicePopup());
      } else if (state.launcherOpen) {
        dispatch(librarySlice.actions.toggleLauncher());
        /* } else if (state.viewMode === "focus") {
        focusModeClose();
       */
      } else if (state.viewMode !== "default") {
        dispatch(librarySlice.actions.setViewMode("default"));
      } else if (
        state.panels.leftSidebar.open ||
        state.panels.rightSidebar.open
      ) {
        dispatch(librarySlice.actions.closeAllPanels());
      } else {
        dispatch(librarySlice.actions.openAllPanels());
      }
      // @ts-ignore
      window.plausible("keyboard-shortcut-esc");
    } else if (event.metaKey && event.shiftKey && event.key === "p") {
      event.preventDefault();
      dispatch(librarySlice.actions.togglePrompts());
      // @ts-ignore
      window.plausible("keyboard-shortcut-prompts");
    } else if (event.metaKey && event.shiftKey && event.key === "d") {
      event.preventDefault();
      // @ts-ignore
      window.plausible("keyboard-shortcut-diff");

      if (state.viewMode === "diff") {
        dispatch(librarySlice.actions.setTextForDiff(null));
        dispatch(librarySlice.actions.setViewMode("default"));
        return;
      }
      if (
        viewMode !== "diff" &&
        editor.activeTextIndex !== currentText.length - 1
      ) {
        const originalText = currentText[editor.activeTextIndex].text;
        const newText = currentText[editor.activeTextIndex + 1].text;
        const textForDiff = { originalText, newText };
        dispatch(librarySlice.actions.setTextForDiff(textForDiff));
        dispatch(librarySlice.actions.setViewMode("diff"));
      }
    } else if (event.shiftKey && event.metaKey && event.key === "c") {
      event.preventDefault();
      dispatch(librarySlice.actions.toggleChat());
      // @ts-ignore
      window.plausible("keyboard-shortcut-chat");
    } else if (event.shiftKey && event.metaKey && event.key === "m") {
      event.preventDefault();
      await newCompostNote();
      // @ts-ignore
      window.plausible("keyboard-shortcut-new-compost-note");
    } else if (event.shiftKey && event.metaKey && event.key === "r") {
      event.preventDefault();
      if (state.viewMode === "readonly") {
        dispatch(librarySlice.actions.setViewMode("default"));
      } else {
        dispatch(librarySlice.actions.setViewMode("readonly"));
        dispatch(librarySlice.actions.closeAllPanels());
      }
      // @ts-ignore
      window.plausible("keyboard-shortcut-readonly");
    } else if (event.shiftKey && event.metaKey && event.key === "f") {
      event.preventDefault();
      dispatch(librarySlice.actions.toggleSearch());
      // @ts-ignore
      window.plausible("keyboard-shortcut-find");

      /*   if (state.viewMode === "focus") {
        dispatch(librarySlice.actions.setViewMode("default"));
      } else {
        dispatch(librarySlice.actions.setViewMode("focus"));
      } */
    } else if (event.metaKey && event.key === "p") {
      event.preventDefault();
      dispatch(librarySlice.actions.toggleLauncher());
      // @ts-ignore
      window.plausible("keyboard-shortcut-launcher");
    } else if (event.shiftKey && event.metaKey && event.key === "b") {
      event.preventDefault();
      dispatch(librarySlice.actions.toggleOutline());
      // @ts-ignore
      window.plausible("keyboard-shortcut-outline");
    } else if (event.metaKey && event.key === "b") {
      event.preventDefault();
      dispatch(librarySlice.actions.toggleBlocks());
      // @ts-ignore
      window.plausible("keyboard-shortcut-blocks");
    }
  });

  const fetchBooks = async () => {
    // @ts-ignore
    dispatch(fetchBooksThunk());
  };

  const fetchSettings = async () => {
    setLoading(true);
    const result = await fd.fetchSettings();
    setLoading(false);

    if (result.tag === "success") {
      result.payload.settings.num_suggestions = parseInt(
        result.payload.settings.num_suggestions
      );
      result.payload.settings.max_tokens = parseInt(
        result.payload.settings.max_tokens
      );

      setSettings(result.payload.settings);
      setUsage(result.payload.usage);
    } else {
      dispatch(librarySlice.actions.setError(result.message));
    }
  };

  function maybeEncrypt(func) {
    if (settings.encrypted) {
      if (state.encryptionPassword) {
        func(state.encryptionPassword);
      } else {
        const popupData: t.PopupData = {
          title: `Please enter your password to encrypt your books. ${state.error}`,
          inputValue: "",
          onSubmit: (userEnteredPassword) => {
            dispatch(
              librarySlice.actions.setEncryptionPassword(userEnteredPassword)
            );
            func(userEnteredPassword);
          },
        };
        dispatch(librarySlice.actions.showPopup(popupData));
      }
    }
  }

  const fetchBookTitles = async () => {
    if (!bookid && !chapterid) return;
    setLoading(true);
    const result = await fd.fetchBookTitles();
    setLoading(false);

    if (result.tag === "success") {
      setCachedBooks(
        result.payload.books.map((book) => ({
          title: book.title,
          bookid: book.bookid,
          tag: book.tag,
        }))
      );
      /*    result.payload.settings.num_suggestions = parseInt(
        result.payload.settings.num_suggestions
      );
      result.payload.settings.max_tokens = parseInt(
        result.payload.settings.max_tokens
      );

      setSettings(result.payload.settings);
      setUsage(result.payload.usage); */
    } else {
      dispatch(librarySlice.actions.setError(result.message));
    }
  };

  useEffect(() => {
    const func = async () => {
      await Promise.all([fetchBooks(), fetchSettings()]);
      //await Promise.all([fetchBooks(), fetchSettings(), fetchBookTitles()]);
    };
    sessionStorage.setItem("clientSessionId", nanoid());

    //setCookie("clientid", nanoid(), 1);
    func();
  }, []);

  const navigate = useNavigate();

  const onLauncherClose = () => {
    dispatch(librarySlice.actions.toggleLauncher());
  };

  async function onTextEditorSave(
    someState: t.State | null = null,
    shouldSaveToHistory = false
  ) {
    const _state = someState || state;
    const chapter = getSelectedChapter({ library: _state });
    if (!chapter) {
    } else {
      await saveChapter(chapter, _state.suggestions);
    }
    const book = getSelectedBook({ library: _state });
    if (!book) {
    } else {
      try {
        await saveBook(book);
      } catch (e) {
        dispatch(librarySlice.actions.setError(e.message));
      }
    }

    if (chapter && shouldSaveToHistory) {
      await saveToHistory(_state);
      setTriggerHistoryRerender((t) => t + 1);
    }

    if (!_state.settingsSaved) await saveSettings();
  }

  async function saveToHistory(state: t.State) {
    if (!currentChapter) return;
    const data: t.Commit = {
      id: nanoid(),
      message: "",
      timestamp: Date.now(),
      patch: textToSaveToHistory(currentChapter),
    };
    await makeApiCall(fd.saveToHistory, [currentChapter.chapterid, data]);
  }

  async function makeApiCall(func, args) {
    dispatch(librarySlice.actions.loading());
    const result = await func(...args);
    dispatch(librarySlice.actions.loaded());
    if (result.tag === "error") {
      dispatch(librarySlice.actions.setError(result.message));
    } else {
      dispatch(librarySlice.actions.clearError());
    }
    return result;
  }

  async function newChapter(
    title = "New Chapter",
    _text = "",
    _bookid: string | null = null
  ) {
    const theBookid = _bookid || bookid;
    let text = _text;
    if (encryptionPassword !== null) {
      text = encryptMessage(text, encryptionPassword);
    }
    const result = await makeApiCall(fd.newChapter, [theBookid, title, text]);
    if (result.tag === "success") {
      const chapter = result.payload;
      dispatch(librarySlice.actions.newChapter({ chapter, bookid: theBookid }));
      navigate(`/book/${theBookid}/chapter/${chapter.chapterid}`, {});
    }
  }

  async function newCompostNote() {
    if (compostBookId === null) return;
    const title = new Date().toDateString();
    await newChapter(title, "", compostBookId);
  }

  async function newBook() {
    const res = await fd.newBook();
    if (res.tag === "error") {
      dispatch(librarySlice.actions.setError(res.message));
    } else {
      const book = res.payload;
      dispatch(librarySlice.actions.newBook(book));
    }
  }

  function addToWritingStreak(chapter: t.Chapter) {
    if (!chapter.writingStreak) {
      chapter.writingStreak = [];
    } else {
      chapter.writingStreak = chapter.writingStreak.slice();
    }
    const todaysDate = today();
    const exists = chapter.writingStreak.find(
      (date) =>
        date.day === todaysDate.day &&
        date.month === todaysDate.month &&
        date.year === todaysDate.year
    );
    if (!exists) {
      chapter.writingStreak.push(todaysDate);
    }
  }

  async function saveChapter(
    _chapter: t.Chapter,
    suggestions: t.Suggestion[] | null = null
  ) {
    let chapter: t.Chapter = { ..._chapter };
    if (suggestions !== null) {
      chapter.suggestions = suggestions;
    }

    maybeEncrypt((password) => {
      chapter = encryptObject(chapter, password);
    });

    try {
      addToWritingStreak(chapter);
    } catch (e) {
      dispatch(
        librarySlice.actions.setError(
          `Error adding to writing streak: ${e.message}`
        )
      );
    }
    try {
      const result = await makeApiCall(fd.saveChapter, [chapter]);

      if (result.tag === "success") {
        const data = result.payload;
        chapter.lastHeardFromServer = data.lastHeardFromServer;
        chapter.created_at = data.lastHeardFromServer;
        dispatch(librarySlice.actions.setSaved(true));
        // Since we depend on a cache version of the selected book when picking a chapter
        // we must also set the chapter on said cache whenever save occurs.
        // This avoids the issue in which switching a chapter loses your last saved work.
        dispatch(
          librarySlice.actions.updateTimestampForChapter({
            chapterid: chapter.chapterid,
            lastHeardFromServer: data.lastHeardFromServer,
          })
        );
        dispatch(
          librarySlice.actions.updateTimestampForBook({
            bookid: chapter.bookid,
            lastHeardFromServer: data.lastHeardFromServer,
          })
        );
      }
    } catch (e) {
      dispatch(
        librarySlice.actions.setError(`Error saving chapter: ${e.message}`)
      );
    }
  }

  async function checkIfStale() {
    const result = await fd.checkIfStale();
    if (result.tag === "error") {
      dispatch(
        librarySlice.actions.setError(
          `Error checking if stale: ${result.message}`
        )
      );

      return false;
    } else if (result.payload.stale) {
      if (state.saved) {
        // no changes, so just reload
        dispatch(
          librarySlice.actions.setInfo("Changes detected, reloading...")
        );

        setLoading(true);
        await fetchBooks();
        setLoading(false);
        dispatch(
          librarySlice.actions.setInfo(
            "We detected changes and updated your data. You are now up to date!"
          )
        );
      } else {
        dispatch(librarySlice.actions.setError(result.payload.message));
      }
      return true;
    }
    return false;
  }

  async function saveSettings() {
    const _settings = { ...settings };
    _settings.customKey = null;

    const result = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ settings: _settings, csrfToken: getCsrfToken() }),
    });
    if (result.ok) {
      const data = await result.json();

      setSettings((settings) => {
        return { ...settings, created_at: data.lastHeardFromServer };
      });
    } else {
      dispatch(librarySlice.actions.setError("Error saving settings"));
    }
    dispatch(librarySlice.actions.setSettingsSaved(true));
  }

  useInterval(() => {
    const func = async () => {
      if (state.saved) return;
      const chapter = getSelectedChapter({ library: state });
      if (chapter) {
        await saveChapter(chapter, state.suggestions);
      }
      const book = getSelectedBook({ library: state });

      if (!book) {
        console.log("No book to save");
        return;
      }
      await saveBook(book);
    };
    func();
  }, 5000);

  useInterval(() => {
    const func = async () => {
      if (state.settingsSaved) return;
      await saveSettings();
    };
    func();
  }, 5000);

  async function renameBook(bookid: string, newTitle: string) {
    const book = state.books.find((b) => b.bookid === bookid);
    if (!book) return;
    const newBook = { ...book, title: newTitle };
    await saveBook(newBook);
  }

  async function renameChapter(chapterid: string, newTitle: string) {
    const chapter = getChapter(chapterid)({ library: state });
    if (!chapter) return;
    const newChapter = { ...chapter, title: newTitle };
    await saveChapter(newChapter, null);
  }

  async function deleteChapter(deletedChapterid: string) {
    dispatch(librarySlice.actions.deleteChapter(deletedChapterid));
    if (deletedChapterid === chapterid) {
      dispatch(librarySlice.actions.noChapterSelected());
      navigate(`/book/${state.selectedBookId}`);
    }
  }

  async function saveBook(book: t.Book) {
    if (!book) {
      return;
    }

    let bookNoChapters = { ...book };

    bookNoChapters.chapters = [];

    maybeEncrypt((password) => {
      bookNoChapters = encryptObject(bookNoChapters, password);
    });

    const result = await makeApiCall(fd.saveBook, [bookNoChapters]);

    if (result.tag === "success") {
      const data = result.payload;

      // We are going to update the book but not update its chapters.
      // This is because save chapter and save book both happen in the same cycle.
      // saveChapter updates the chapter in the redux store.
      // If we include the chapters here, it will overwrite the updates from saveChapter.
      bookNoChapters.lastHeardFromServer = data.created_at;
      bookNoChapters.created_at = data.created_at;
      dispatch(librarySlice.actions.setSaved(true));
      dispatch(
        librarySlice.actions.updateTimestampForBook({
          bookid: bookNoChapters.bookid,
          lastHeardFromServer: data.lastHeardFromServer,
        })
      );
    }
  }

  const addToContents = (text: string) => {
    dispatch(librarySlice.actions.addToContents(text));
  };

  function setLoading(bool) {
    if (bool) {
      dispatch(librarySlice.actions.loading());
    } else {
      dispatch(librarySlice.actions.loaded());
    }
  }

  function getTextForSuggestions() {
    if (!currentText) return "";
    let { text } = currentTextBlock;
    if (
      state.editor._cachedSelectedText &&
      state.editor._cachedSelectedText.contents &&
      state.editor._cachedSelectedText.contents.length > 0
    ) {
      text = state.editor._cachedSelectedText.contents;
    }
    return text;
  }

  async function fetchSuggestions(prompt: t.Prompt, messages: t.ChatItem[]) {
    let action: t.PromptAction = {
      type: "addToSuggestionsList",
    };
    let promptText = prompt.text;
    if (prompt.action === "replaceSelection") {
      action = {
        type: "replaceSelection",
        selection: state.editor._cachedSelectedText,
      };
    } else if (prompt.action === "showMultipleChoice") {
      action = {
        type: "showMultipleChoice",
        selection: state.editor._cachedSelectedText,
      };
      promptText += "\nGive the result as comma separated values.";
    }

    setLoading(true);

    const params: t.FetchSuggestionsParams = {
      model: settings.model,
      num_suggestions: settings.num_suggestions || 1,
      max_tokens: settings.max_tokens || 1,
      prompt: promptText,
      messages,
      customKey: settings.customKey || null,
      replaceParams: {
        text: getTextForSuggestions(),
        synopsis: currentBook?.synopsis || "",
      },
    };

    const result = await fd.fetchSuggestions(params);
    setLoading(false);

    if (result.tag === "error") {
      dispatch(librarySlice.actions.setError(result.message));
      return;
    }

    result.payload.forEach((choice: { text: any }) => {
      const generatedText = choice.text;
      if (action.type === "addToSuggestionsList") {
        dispatch(
          librarySlice.actions.addSuggestion({
            label: prompt.label,
            value: generatedText,
          })
        );
      } else if (action.type === "replaceSelection") {
        dispatch(
          librarySlice.actions.replaceContents({
            text: generatedText,
            index: action.selection.index,
            length: action.selection.length,
          })
        );
      } else if (action.type === "showMultipleChoice") {
        const { index, length } = action.selection;
        dispatch(
          librarySlice.actions.setSelection({
            index,
            length,
          })
        );

        const options = generatedText.split(/[,\n] ?/).map((text: string) => ({
          label: text,
          value: text,
        }));

        dispatch(
          librarySlice.actions.showMultipleChoicePopup({
            title: "",
            options,
            onClick: (value: string) => {
              dispatch(
                librarySlice.actions.replaceContents({
                  text: value,
                  index,
                  length,
                })
              );
            },
          })
        );

        console.log(generatedText, generatedText.split(","));
      }
    });
    if (action.type === "addToSuggestionsList") {
      dispatch(librarySlice.actions.openRightSidebar());
      dispatch(librarySlice.actions.setActivePanel("suggestions"));
    }
  }

  const libraryUtils: t.LibraryContextType = {
    newChapter,
    newBook,
    newCompostNote,
    renameBook,
    renameChapter,
    saveBook,
    saveChapter,
    setLoading,
    settings,
    setSettings,
    usage,
    deleteChapter,
    onTextEditorSave,
    mobile,
    fetchBooks,
    fetchSuggestions,
  };

  if (state.viewMode === "diff" && currentText && textForDiff) {
    return (
      <LibraryContext.Provider value={libraryUtils}>
        <LibErrorBoundary component="diff mode">
          <DiffViewer
            originalText={textForDiff.originalText}
            newText={textForDiff.newText}
            onClose={() =>
              dispatch(librarySlice.actions.setViewMode("default"))
            }
          />
        </LibErrorBoundary>
      </LibraryContext.Provider>
    );
  }

  if (state.viewMode === "fullscreen" && currentChapter) {
    return (
      <div className="w-3/4 mx-auto flex-none h-screen overflow-auto">
        <LibraryContext.Provider value={libraryUtils}>
          {state.launcherOpen && (
            <LibraryLauncher onLauncherClose={onLauncherClose} />
          )}

          <Sidebar />
        </LibraryContext.Provider>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <LibraryContext.Provider value={libraryUtils}>
        {mobile && <LibraryMobile />}
        {!mobile && <LibraryDesktop />}
      </LibraryContext.Provider>
    </div>
  );
}

import {
  ArrowSmallLeftIcon,
  ArrowSmallRightIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ArrowsUpDownIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  BookOpenIcon,
  ChatBubbleLeftIcon,
  ClipboardIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  InformationCircleIcon,
  LockClosedIcon,
  PencilIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  ViewColumnsIcon,
  WrenchIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import sortBy from "lodash/sortBy";
import React, { useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Launcher from "../Launcher";
import LibraryContext from "../LibraryContext";
import * as t from "../Types";
import {
  LibraryContextType,
  MenuItem,
  State,
  blockTypes,
  chapterStatuses,
} from "../Types";
import * as fd from "../lib/fetchData";
import { useRecording } from "../lib/hooks";
import { languages } from "../lib/languages";
import {
  getSelectedBook,
  getSelectedChapter,
  librarySlice,
} from "../reducers/librarySlice";
import { AppDispatch, RootState } from "../store";

export default function LibraryLauncher({ onLauncherClose }) {
  const state: State = useSelector((state: RootState) => state.library);
  const currentBook = useSelector(getSelectedBook);

  const currentChapter = getSelectedChapter({ library: state });
  const currentText: t.TextBlock[] = useSelector((state: RootState) => {
    const chapter = getSelectedChapter(state);
    return chapter ? chapter.text : [];
  });

  let currentTextBlock: t.TextBlock | null = null;
  if (state.editor.activeTextIndex !== null) {
    currentTextBlock = currentText[state.editor.activeTextIndex];
  }

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const {
    newBook,
    newCompostNote,
    newChapter,
    renameBook,
    renameChapter,
    settings,
    setSettings,
    fetchSuggestions,
  } = useContext(LibraryContext) as LibraryContextType;
  const { startRecording, stopRecording } = useRecording();

  function toggleRightPanel(panel: string) {
    if (
      state.panels.rightSidebar.open &&
      state.panels.rightSidebar.activePanel === panel
    ) {
      dispatch(librarySlice.actions.closeRightSidebar());
    } else {
      dispatch(librarySlice.actions.openRightSidebar());
      dispatch(librarySlice.actions.setActivePanel(panel));
    }
  }

  function getTextForSuggestions() {
    let { text } = currentText[state.editor.activeTextIndex];
    if (
      state.editor._cachedSelectedText &&
      state.editor._cachedSelectedText.contents &&
      state.editor._cachedSelectedText.contents.length > 0
    ) {
      text = state.editor._cachedSelectedText.contents;
    }
    return text;
  }

  function clearCache() {
    caches.keys().then(function (names) {
      for (let name of names) caches.delete(name);
    });
  }

  const launchItems: MenuItem[] = [
    {
      label: "New Chapter",
      onClick: newChapter,
      icon: <PlusIcon className="h-4 w-4" aria-hidden="true" />,
      plausibleEventName: "new-chapter",
    },
    {
      label: "New Book",
      onClick: newBook,
      icon: <PlusIcon className="h-4 w-4" aria-hidden="true" />,
      plausibleEventName: "new-book",
    },
    {
      label: "New Compost Note",
      onClick: newCompostNote,
      icon: <PlusIcon className="h-4 w-4" aria-hidden="true" />,
      tooltip: "Command+Shift+m",
      plausibleEventName: "new-compost-note",
    },
    /*  {
      label: "Grid",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        navigate(`/grid/${bookid}`);
      },
    }, */
    {
      label:
        state.panels.leftSidebar.open &&
        state.panels.leftSidebar.activePanel === "filenavigator"
          ? "Close File Navigator"
          : "Open File Navigator",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.toggleFileNavigator());
      },
      tooltip: "Command+Shift+o",
    },

    {
      label:
        state.panels.leftSidebar.open &&
        state.panels.leftSidebar.activePanel === "prompts"
          ? "Close Prompts"
          : "Open Prompts",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.togglePrompts());
      },
      tooltip: "Command+p",
    },
    {
      label:
        state.panels.rightSidebar.open &&
        state.panels.rightSidebar.activePanel === "chat"
          ? "Close Chat"
          : "Open Chat",
      icon: <ChatBubbleLeftIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.toggleChat());
      },
      tooltip: "Command+shift+c",
    },
    {
      label:
        state.panels.rightSidebar.open &&
        state.panels.rightSidebar.activePanel === "encryption"
          ? "Close Encryption Panel"
          : "Open Encryption Panel",
      icon: <LockClosedIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.toggleEncryption());
      },
    },

    {
      label:
        state.panels.leftSidebar.open &&
        state.panels.leftSidebar.activePanel === "blocks"
          ? "Close Blocks"
          : "Open Blocks",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.toggleBlocks());
      },
      tooltip: "Command+b",
    },
    {
      label:
        state.panels.leftSidebar.open &&
        state.panels.leftSidebar.activePanel === "versions"
          ? "Close Versions"
          : "Open Versions",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.toggleVersions());
      },
      tooltip: "Command+shift+v",
    },
    {
      label:
        state.panels.leftSidebar.open &&
        state.panels.leftSidebar.activePanel === "outline"
          ? "Close Outline"
          : "Open Outline",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.toggleOutline());
      },
      tooltip: "Command+Shift+b",
    },
    {
      label:
        state.panels.leftSidebar.open &&
        state.panels.leftSidebar.activePanel === "editHistory"
          ? "Close Edit History"
          : "Open Edit History",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.toggleEditHistory());
      },
    },
    {
      label:
        state.panels.leftSidebar.open &&
        state.panels.leftSidebar.activePanel === "debug"
          ? "Close Debug"
          : "Open Debug",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.toggleDebug());
      },
    },
    {
      label:
        state.panels.leftSidebar.open &&
        state.panels.leftSidebar.activePanel === "search"
          ? "Close Search"
          : "Open Search",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.toggleSearch());
      },
      tooltip: "Command+Shift+f",
    },
    {
      label:
        state.panels.leftSidebar.open &&
        state.panels.leftSidebar.activePanel === "publish"
          ? "Close Publish"
          : "Open Publish",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.togglePublish());
      },
    },
    {
      label:
        state.panels.leftSidebar.open &&
        state.panels.leftSidebar.activePanel === "export"
          ? "Close Export"
          : "Open Export",
      icon: <ViewColumnsIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.toggleExport());
      },
    },
    {
      label:
        state.panels.rightSidebar.open &&
        state.panels.rightSidebar.activePanel === "history"
          ? "Close History"
          : "Open History",
      icon: <ClockIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        toggleRightPanel("history");
      },
    },
    {
      label:
        state.panels.rightSidebar.open &&
        state.panels.rightSidebar.activePanel === "info"
          ? "Close Info"
          : "Open Info",
      icon: <InformationCircleIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        toggleRightPanel("info");
      },
    },
    {
      label:
        state.panels.rightSidebar.open &&
        state.panels.rightSidebar.activePanel === "suggestions"
          ? "Close Suggestions"
          : "Open Suggestions",
      icon: <ClipboardIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        toggleRightPanel("suggestions");
      },
    },
    {
      label:
        state.panels.rightSidebar.open &&
        state.panels.rightSidebar.activePanel === "settings"
          ? "Close Settings"
          : "Open Settings",
      icon: <Cog6ToothIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        toggleRightPanel("settings");
      },
    },
    /* {
      label: "Show Book List Only",
      icon: <Cog6ToothIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.openOnlyPanel("bookList"));
      },
    },
    {
      label: "Show Chapter List Only",
      icon: <Cog6ToothIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.openOnlyPanel("chapterList"));
      },
    },
    {
      label: "Show Prompts Only",
      icon: <Cog6ToothIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.openOnlyPanel("prompts"));
      },
    },
    {
      label: "Show Sidebar Only",
      icon: <Cog6ToothIcon className="w-6 h-6 xl:w-5 xl:h-5" />,
      onClick: () => {
        dispatch(librarySlice.actions.openOnlyPanel("sidebar"));
      },
    }, */
  ];

  if (state.books) {
    sortBy(state.books, ["title"]).forEach((book, i) => {
      sortBy(book.chapters, ["title"]).forEach((chapter, i) => {
        let label = chapter.title || "(No title)";
        label = `${label} (${book.title})`;
        //if (label.length > 30) label = label.slice(0, 30) + "...";
        launchItems.push({
          label,
          onClick: () => {
            navigate(`/book/${book.bookid}/chapter/${chapter.chapterid}`);
          },
          icon: <Bars3BottomLeftIcon className="h-4 w-4" aria-hidden="true" />,
        });
      });
    });
  }

  state.books.forEach((book, i) => {
    launchItems.push({
      label: book.title,
      onClick: () => {
        navigate(`/book/${book.bookid}`);
      },
      icon: <BookOpenIcon className="h-4 w-4" aria-hidden="true" />,
    });
  });

  settings.prompts.forEach((prompt, i) => {
    launchItems.push({
      label: prompt.label,
      onClick: async () => {
        await fetchSuggestions(prompt, []);
      },
      icon: <SparklesIcon className="h-4 w-4" aria-hidden="true" />,
    });
  });

  /*   if (state.panels.sidebar.open) {
    launchItems.push({
      label: "Close Sidebar",
      onClick: () => {
        dispatch(librarySlice.actions.closeSidebar());
      },
      icon: <ViewColumnsIcon className="h-4 w-4" aria-hidden="true" />,
    });
  } else {
    launchItems.push({
      label: "Open Sidebar",
      onClick: () => {
        dispatch(librarySlice.actions.openRightSidebar());
      },
      icon: <ViewColumnsIcon className="h-4 w-4" aria-hidden="true" />,
    });
  } */

  if (state.openTabs.length > 0) {
    launchItems.push({
      label: "Close Tab",
      onClick: () => {
        dispatch(librarySlice.actions.closeTab());
      },
      icon: <XMarkIcon className="h-4 w-4" aria-hidden="true" />,
      tooltip: "Command+shift+x",
    });
  }
  if (state.openTabs.length > 1) {
    launchItems.push({
      label: "Previous Tab",
      onClick: () => {
        dispatch(librarySlice.actions.prevTab());
      },
      icon: <ArrowSmallLeftIcon className="h-4 w-4" aria-hidden="true" />,
      tooltip: "Command+[",
    });
    launchItems.push({
      label: "Next Tab",
      onClick: () => {
        dispatch(librarySlice.actions.nextTab());
      },
      icon: <ArrowSmallRightIcon className="h-4 w-4" aria-hidden="true" />,
      tooltip: "Command+]",
    });
  }
  if (state.viewMode === "fullscreen") {
    launchItems.push({
      label: "Exit Fullscreen",
      onClick: () => {
        dispatch(librarySlice.actions.setViewMode("default"));
      },
      icon: <ArrowsPointingInIcon className="h-4 w-4" aria-hidden="true" />,
      tooltip: "Esc",
    });
  } else {
    launchItems.push({
      label: "View Sidebar In Fullscreen",
      onClick: () => {
        dispatch(librarySlice.actions.setViewMode("fullscreen"));
      },
      icon: <ArrowsPointingOutIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }

  launchItems.push({
    label: "New Block Before Current",
    onClick: () => {
      dispatch(librarySlice.actions.newBlockBeforeCurrent());
    },
    icon: <Bars3Icon className="h-4 w-4" aria-hidden="true" />,
  });

  launchItems.push({
    label: "New Block After Current",
    onClick: () => {
      dispatch(librarySlice.actions.newBlockAfterCurrent());
    },
    icon: <Bars3Icon className="h-4 w-4" aria-hidden="true" />,
  });

  if (
    state.editor._cachedSelectedText &&
    state.editor._cachedSelectedText.length > 0
  ) {
    launchItems.push({
      label: "Extract Block",
      onClick: () => {
        dispatch(librarySlice.actions.extractBlock());
      },
      icon: <Bars3Icon className="h-4 w-4" aria-hidden="true" />,
      tooltip: "Alt+Shift+Down",
    });
  }
  if (state.editor.activeTextIndex !== 0) {
    launchItems.push({
      label: "Merge Block Up",
      onClick: () => {
        dispatch(librarySlice.actions.mergeBlockUp());
      },
      icon: <BarsArrowUpIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }
  if (state.editor.activeTextIndex !== currentText.length - 1) {
    launchItems.push({
      label: "Merge Block Down",
      onClick: () => {
        dispatch(librarySlice.actions.mergeBlockDown());
      },
      icon: <BarsArrowDownIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }
  if (
    state.editor.activeTextIndex !== 0 &&
    state.editor.activeTextIndex !== currentText.length - 1
  ) {
    launchItems.push({
      label: "Merge With Surrounding Blocks",
      onClick: () => {
        dispatch(librarySlice.actions.mergeBlockSurrounding());
      },
      icon: <ArrowsUpDownIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }

  if (state.viewMode !== "readonly") {
    launchItems.push({
      label: "Read Only Mode",
      onClick: () => {
        dispatch(librarySlice.actions.setViewMode("readonly"));
      },
      icon: <PencilIcon className="h-4 w-4" aria-hidden="true" />,
      tooltip: "Command+Shift+r",
    });
  }

  if (state.viewMode !== "focus") {
    launchItems.push({
      label: "Focus Mode",
      onClick: () => {
        dispatch(librarySlice.actions.setViewMode("focus"));
      },
      icon: <EyeIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }
  if (
    state.viewMode !== "diff" &&
    state.editor.activeTextIndex !== currentText.length - 1
  ) {
    launchItems.push({
      label: "Diff with block below",
      onClick: () => {
        dispatch(librarySlice.actions.setViewMode("diff"));
      },
      icon: <DocumentDuplicateIcon className="h-4 w-4" aria-hidden="true" />,
      tooltip: "Command+Shift+d",
    });
  }

  if (currentText.length && currentText.length > 0) {
    launchItems.push({
      label: "Convert title to title case",
      onClick: () => {
        dispatch(librarySlice.actions.setAPStyleTitle());
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }

  if (currentChapter) {
    launchItems.push({
      label: "Rename Chapter",
      onClick: () => {
        dispatch(
          librarySlice.actions.showPopup({
            title: "Rename Chapter",
            inputValue: currentChapter.title,
            onSubmit: (newTitle) =>
              renameChapter(currentChapter.chapterid, newTitle),
          })
        );
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }

  if (currentBook) {
    launchItems.push({
      label: "Rename Book",
      onClick: () => {
        dispatch(
          librarySlice.actions.showPopup({
            title: "Rename Book",
            inputValue: currentBook.title,
            onSubmit: (newTitle) => renameBook(currentBook.bookid, newTitle),
          })
        );
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }

  if (currentTextBlock) {
    launchItems.push({
      label: "Add New Version",
      onClick: () => {
        dispatch(
          librarySlice.actions.addVersion({
            index: state.editor.activeTextIndex,
          })
        );
      },
      icon: <Bars3BottomLeftIcon className="h-4 w-4" aria-hidden="true" />,
    });
    launchItems.push({
      label: "Add Caption",
      onClick: () => {
        dispatch(
          librarySlice.actions.showPopup({
            title: "Add Caption",
            inputValue: currentTextBlock.caption || "",
            onSubmit: (newCaption) =>
              dispatch(
                librarySlice.actions.addCaption({
                  index: state.editor.activeTextIndex,
                  caption: newCaption,
                })
              ),
          })
        );
      },
      icon: <Bars3BottomLeftIcon className="h-4 w-4" aria-hidden="true" />,
    });
    if (currentTextBlock.caption) {
      launchItems.push({
        label: "Remove Caption",
        onClick: () => {
          dispatch(
            librarySlice.actions.addCaption({
              index: state.editor.activeTextIndex,
              caption: "",
            })
          );
        },
        icon: <Bars3BottomLeftIcon className="h-4 w-4" aria-hidden="true" />,
      });
    }

    if (currentTextBlock.reference) {
      launchItems.push({
        label: "Unmark block as reference",
        onClick: () => {
          dispatch(
            librarySlice.actions.unmarkBlockAsReference(
              state.editor.activeTextIndex
            )
          );
        },
        icon: <XMarkIcon className="h-4 w-4" aria-hidden="true" />,
      });
    } else {
      launchItems.push({
        label: "Mark block as reference",
        onClick: () => {
          dispatch(
            librarySlice.actions.markBlockAsReference(
              state.editor.activeTextIndex
            )
          );
        },
        icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
      });
    }
    if (currentTextBlock.open) {
      launchItems.push({
        label: "Close/Fold block",
        onClick: () => {
          dispatch(
            librarySlice.actions.closeBlock(state.editor.activeTextIndex)
          );
        },
        icon: <XMarkIcon className="h-4 w-4" aria-hidden="true" />,
      });
    } else {
      launchItems.push({
        label: "Open block",
        onClick: () => {
          dispatch(
            librarySlice.actions.openBlock(state.editor.activeTextIndex)
          );
        },
        icon: <Bars3Icon className="h-4 w-4" aria-hidden="true" />,
      });
    }
    blockTypes.forEach((blockType) => {
      if (currentTextBlock.type !== blockType) {
        launchItems.push({
          label: `Convert to ${blockType}`,
          onClick: () => {
            dispatch(
              librarySlice.actions.setBlockType({
                index: state.editor.activeTextIndex,
                type: blockType,
              })
            );
          },
          icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
        });
      }
    });

    const textishBlocks: t.BlockType[] = ["plain", "markdown", "code"];

    textishBlocks.forEach((blockType) => {
      if (currentTextBlock.type !== blockType) {
        launchItems.push({
          label: `Convert all blocks to ${blockType}`,
          onClick: () => {
            currentText.forEach((textBlock, index) => {
              dispatch(
                librarySlice.actions.setBlockType({
                  index,
                  type: blockType,
                })
              );
            });
          },
          icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
        });
      }
    });
    languages.forEach((language) => {
      launchItems.push({
        label: `Set language to ${language}`,
        onClick: () => {
          dispatch(
            librarySlice.actions.setLanguage({
              index: state.editor.activeTextIndex,
              language,
            })
          );
        },
        icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
      });
    });
  }

  if (currentBook) {
    launchItems.push({
      label: "Train on book",
      onClick: async () => {
        const embed = await fd.trainOnBook(currentBook.bookid);
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }
  if (currentChapter) {
    launchItems.push({
      label: "Close/Fold all blocks",
      onClick: async () => {
        currentChapter.text.forEach((text, i) => {
          dispatch(librarySlice.actions.closeBlock(i));
        });
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });
    launchItems.push({
      label: "Get embeddings",
      onClick: async () => {
        const embed = await fd.getEmbeddings(currentChapter);
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });

    chapterStatuses.forEach((status) => {
      if (currentChapter.status !== status) {
        launchItems.push({
          label: `Mark as ${status.replaceAll("-", " ")}`,
          onClick: () => {
            dispatch(librarySlice.actions.setChapterStatus(status));
          },
          icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
        });
      }
    });

    state.books.forEach((book, i) => {
      if (book.bookid !== currentChapter.bookid) {
        launchItems.push({
          label: `Move to ${book.title}`,
          onClick: () => {
            const currentBookId = currentChapter.bookid;
            dispatch(librarySlice.actions.moveChapter(book.bookid));
            navigate(
              `/book/${book.bookid}/chapter/${currentChapter.chapterid}`
            );
          },
          icon: (
            <ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
          ),
        });
      }
    });

    if (!state.helpOpen) {
      launchItems.push({
        label: "Show help",
        onClick: () => {
          dispatch(librarySlice.actions.toggleHelp());
        },
        icon: <QuestionMarkCircleIcon className="h-4 w-4" aria-hidden="true" />,
      });
    }
  }

  launchItems.push({
    label: "Close All Tabs",
    onClick: () => {
      dispatch(librarySlice.actions.closeAllTabs());
      navigate("/");
    },
    icon: <XMarkIcon className="h-4 w-4" aria-hidden="true" />,
  });

  launchItems.push({
    label: "Close All Other Tabs",
    onClick: () => {
      dispatch(librarySlice.actions.closeAllOtherTabs());
    },
    icon: <XMarkIcon className="h-4 w-4" aria-hidden="true" />,
  });

  launchItems.push({
    label: "Clear Cache",
    onClick: () => {
      clearCache();
    },
    icon: <XMarkIcon className="h-4 w-4" aria-hidden="true" />,
    plausibleEventName: "clear-cache",
  });

  if (currentChapter) {
    launchItems.push({
      label: "Strip non-ASCII characters",
      onClick: async () => {
        dispatch(librarySlice.actions.stripNonAsciiCharacters());
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }

  if (state.showStructure) {
    launchItems.push({
      label: "Hide Structure",
      onClick: async () => {
        dispatch(librarySlice.actions.setShowStructure(false));
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });
  } else {
    launchItems.push({
      label: "Show Structure",
      onClick: async () => {
        dispatch(librarySlice.actions.setShowStructure(true));
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }

  if (currentTextBlock.versions && currentTextBlock.versions.length === 1) {
    launchItems.push({
      label: "Diff With Version",
      onClick: async () => {
        const originalText = currentTextBlock.text;
        const newText = currentTextBlock.versions![0].text;
        const textForDiff = { originalText, newText };
        dispatch(librarySlice.actions.setTextForDiff(textForDiff));
        dispatch(librarySlice.actions.setViewMode("diff"));
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });

    launchItems.push({
      label: "Switch To Other Version",
      onClick: async () => {
        dispatch(
          librarySlice.actions.switchVersion({
            index: state.editor.activeTextIndex,
            versionid: currentTextBlock.versions![0].id,
          })
        );
      },
      icon: <WrenchIcon className="h-4 w-4" aria-hidden="true" />,
    });
  }

  /* if (settings.admin) {
    launchItems.push({
      label: state.recording ? "Stop Recording" : "Start Recording",
      onClick: () => {
        if (state.recording) {
          dispatch(librarySlice.actions.stopRecording());
          stopRecording();
        } else {
          dispatch(librarySlice.actions.startRecording());
          startRecording();
        }
      },
      icon: <MicrophoneIcon className="h-4 w-4" aria-hidden="true" />,
      plausibleEventName: "record",
    });
  } */

  function onChoose(item: t.MenuItem) {
    const label = item.label;
    const cache = settings.autocompleteCache || {};
    const newCache = { ...cache };
    if (label in newCache) {
      newCache[label] += 1;
    } else {
      newCache[label] = 1;
    }
    setSettings({ ...settings, autocompleteCache: newCache });
    dispatch(librarySlice.actions.setSettingsSaved(false));
  }

  return (
    <Launcher
      //@ts-ignore
      items={launchItems}
      open={state.launcherOpen}
      close={onLauncherClose}
      onChoose={onChoose}
      autocompleteCache={settings.autocompleteCache || {}}
    />
  );
}

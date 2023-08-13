import React from "react";
import { useDispatch, useSelector } from "react-redux";
import * as t from "../Types";
import { RootState } from "../store";
import Select from "./Select";
import { librarySlice } from "../reducers/librarySlice";
import Launcher from "./Launcher";
import Button from "./Button";
import ReadOnlyView from "../ReadOnlyView";
import { Link } from "react-router-dom";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import BlockMenu from "./BlockMenu";

export default function EmbeddedTextBlock({
  chapterid,
  text,
  index,
}: {
  chapterid: string;
  text: t.EmbeddedTextBlock;
  index: number;
}) {
  const state: t.State = useSelector((state: RootState) => state.library);
  const dispatch = useDispatch();
  const open = text.open;
  const [launcherOpen, setLauncherOpen] = React.useState(false);

  function setOpen(bool: boolean) {
    if (bool) {
      dispatch(librarySlice.actions.openBlock(index));
    } else {
      dispatch(librarySlice.actions.closeBlock(index));
    }
  }

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

  const items = [];
  state.books.forEach((book) => {
    book.chapters.forEach((chapter) => {
      if (chapter.chapterid === chapterid) return;
      items.push({
        label: `${chapter.title} - ${book.title}`,
        onClick: () => {
          dispatch(
            librarySlice.actions.setEmbeddedChapter({
              index,
              bookid: book.bookid,
              chapterid: chapter.chapterid,
            })
          );
        },
        icon: null,
        //<ArrowTopRightOnSquareIcon className="h-4 w-4" aria-hidden="true" />
      });
    });
  });

  return (
    <div className="mb-sm h-full w-full">
      {!open && (
        <div className="flex">
          <div
            className={`flex-none text-sm mr-xs w-4 lg:w-16 text-gray-300 dark:text-gray-500`}
          >
            {text.caption}
          </div>

          <div className="flex-none">
            <div
              className="h-5 cursor-pointer mr-xs"
              onClick={() => {
                setOpen(true);
              }}
              data-selector={`close-${index}`}
            >
              <ChevronRightIcon className={`w-5 h-5 text-gray-500`} />
            </div>
            {/* {<BlockMenu text={text} index={index} />} */}
          </div>
          {chapter && <h3 className="mr-xs text-gray-500">{chapter.title}</h3>}
        </div>
      )}

      {open && (
        <div className="flex">
          <div
            className={`flex-none text-sm mr-xs w-4 lg:w-16 text-gray-300 dark:text-gray-500`}
          >
            {text.caption}
          </div>

          <div className="flex-none">
            <div
              className="h-5 cursor-pointer mr-xs"
              onClick={() => {
                setOpen(false);
              }}
              data-selector={`close-${index}`}
            >
              <ChevronDownIcon className={`w-5 h-5 text-gray-500`} />
            </div>
            <BlockMenu currentText={text} index={index} />
          </div>

          <div className="flex-grow">
            <div className="flex">
              {chapter && <h3 className="mr-xs">{chapter.title}</h3>}
              <Button
                size="small"
                style="secondary"
                rounded={true}
                onClick={() => setLauncherOpen(true)}
              >
                {chapter ? "Change" : "Select"}
              </Button>
              {/* {chapter && (
                <Link
                  to={`/book/${book.bookid}/chapter/${chapter.chapterid}`}
                  className="ml-xs text-sm align-baseline uppercase"
                >
                  Visit
                </Link>
              )} */}
            </div>

            {chapter && (
              <div className="bg-gray-800 p-sm rounded mt-sm">
                <ReadOnlyView textBlocks={chapter.text} fontClass="sansSerif" />
              </div>
            )}
          </div>
        </div>
      )}
      <Launcher
        items={items}
        open={launcherOpen}
        close={() => setLauncherOpen(false)}
      />
    </div>
  );
  /*   return (
    <div>
      <div className="flex">
        <Select
          name={"bookid"}
          title="Book"
          value={text.bookid}
          onChange={(e) =>
            dispatch(
              librarySlice.actions.setEmbeddedBookId({
                index,
                bookid: e.target.value,
              })
            )
          }
        >
          {state.books.map((book) => (
            <option key={book.bookid} value={book.bookid}>
              {book.title}
            </option>
          ))}
        </Select>
        {text.bookid && (
          <Select
            name={"chapterid"}
            title="Chapter"
            value={text.chapterid}
            onChange={(e) =>
              dispatch(
                librarySlice.actions.setEmbeddedChapterId({
                  index,
                  chapterid: e.target.value,
                })
              )
            }
          >
            {state.books.map((book) => (
              <option key={book.chapterid} value={book.chapterid}>
                {book.title}
              </option>
            ))}
          </Select>
        )}
      </div>
    </div>
  ); */
}

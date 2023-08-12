import * as t from "./Types";
import * as fd from "./lib/fetchData";
import md5 from "md5";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "./store";
import React, { useContext, useEffect, useRef } from "react";
import {
  getAllTags,
  getSelectedBook,
  getSelectedBookChapters,
  getSelectedBookWritingStreak,
  librarySlice,
} from "./reducers/librarySlice";
import ContentEditable from "./components/ContentEditable";
import TextArea from "./components/TextArea";
import { Book, Character } from "./Types";
import Button from "./components/Button";
import Input from "./components/Input";
import {
  encryptMessage,
  getChapterText,
  getFontSizeClass,
  getTags,
  isString,
  pluralize,
  prettyDate,
  wordCount,
} from "./utils";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpRightIcon,
  ArrowsUpDownIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { chapterToMarkdown } from "./serverUtils";
import LibraryContext from "./LibraryContext";
import QuillTextArea from "./components/QuillTextArea";
import { useColors, useFonts } from "./lib/hooks";
import readingTime from "reading-time/lib/reading-time";
import CalendarWidget from "./Calendar";
import ListMenu from "./components/ListMenu";

function BookInfo({ book }: { book: Book }) {
  const text = book.chapters
    .map((chapter) => getChapterText(chapter))
    .join("\n\n");

  const word_count = text.trim().split(/\s+/).length;
  return (
    <div className="my-sm flex flex-col text-sm xl:text-md text-gray-400 w-full text-center">
      <p>
        {word_count} words, {readingTime(text).text}
      </p>
    </div>
  );
}

function Character({
  character,
  onNameChange,
  onDescChange,
  onImageUrlChange,
  onAliasesChange,
  onDelete,
}: {
  character: Character;
  onNameChange: (newName: string) => void;
  onDescChange: (newDesc: string) => void;
  onImageUrlChange: (newImageUrl: string) => void;
  onAliasesChange: (newAliases: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const colors = useColors();
  async function handleUpload(x) {
    const files = x.target.files;
    // @ts-ignore
    window.plausible("bookeditor-character-image-upload");
    [...files].forEach(async (file, i) => {
      const res = await fd.upload(file);
      if (res.tag === "success") {
        const { s3key } = res.payload;
        const imageUrl = "/image/" + s3key;

        onImageUrlChange(imageUrl);
      }
    });
  }

  if (!editing) {
    return (
      <div className="">
        {character.imageUrl && character.imageUrl.trim() !== "" && (
          <img
            src={character.imageUrl}
            alt={character.name}
            className="w-full"
            loading="lazy"
          />
        )}
        <h3 className="text-xl font-semibold my-sm w-full text-center">
          {character.name || "Unnamed Character"}
        </h3>
        {character.aliases && character.aliases.trim() !== "" && (
          <p
            className={`text-md font-sans w-full ${colors.secondaryTextColor}`}
          >
            Also known as: {character.aliases}
          </p>
        )}
        <p className="text-lg font-sans w-full">{character.description}</p>
        <Button
          onClick={() => {
            setEditing(true);

            // @ts-ignore
            window.plausible("bookeditor-character-edit-button-click");
          }}
          className="mt-sm"
          size="medium"
        >
          Edit
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col my-sm bg-gray-200 dark:bg-gray-700 rounded-md p-sm">
      {character.imageUrl && character.imageUrl.trim() !== "" && (
        <img
          src={character.imageUrl}
          alt={character.name}
          className=" rounded-full mx-auto mb-sm max-h-96"
        />
      )}
      <Input
        name="name"
        title="name"
        value={character.name}
        onChange={(e) => onNameChange(e.target.value)}
        selector={`character-${character.name}-name`}
      />
      <Input
        name="aliases"
        title="aliases"
        value={character.aliases}
        onChange={(e) => onAliasesChange(e.target.value)}
        selector={`character-${character.aliases}-aliases`}
      />
      <TextArea
        name="description"
        title="description"
        value={character.description}
        onChange={(e) => onDescChange(e.target.value)}
        inputClassName="border-0 resize-none"
        rows={8}
        selector={`character-${character.name}-description`}
      />
      <Input
        name="imageUrl"
        title="Image Url"
        value={character.imageUrl}
        onChange={(e) => onImageUrlChange(e.target.value)}
        selector={`character-${character.name}-imageUrl`}
      />

      <input
        type="file"
        id="imgupload"
        key="upload"
        multiple={false}
        onChange={handleUpload}
      />

      <Button
        onClick={() => setEditing(false)}
        className="mt-sm"
        size="medium"
        style="secondary"
      >
        Done
      </Button>

      <Button onClick={onDelete} className="mt-sm" size="medium">
        Delete
      </Button>
    </div>
  );
}

function Chapter({ chapter, bookid, index }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { deleteChapter } = useContext(LibraryContext) as t.LibraryContextType;
  const colors = useColors();
  async function _deleteChapter() {
    const chapterid = chapter.chapterid;
    dispatch(librarySlice.actions.loading());
    deleteChapter(chapterid);
    // @ts-ignore
    window.plausible("bookeditor-chapter-delete-button-click");
    const res = await fd.deleteChapter(bookid, chapterid);
    dispatch(librarySlice.actions.loaded());
    if (res.tag === "error") {
      dispatch(librarySlice.actions.setError(res.message));
    } else {
      console.log("deleted chapter", { res });
      if (res.payload && res.payload.lastHeardFromServer) {
        dispatch(
          librarySlice.actions.updateTimestampForBook({
            bookid,
            lastHeardFromServer: res.payload.lastHeardFromServer,
          })
        );
      } else {
        dispatch(
          librarySlice.actions.setError(
            "Couldn't update timestamp for book in _deleteChapter"
          )
        );
      }
    }
  }
  let status = "";
  if (chapter.status && chapter.status === "done") {
    status = `✅`;
  } else if (chapter.status && chapter.status === "in-progress") {
    status = `🚧`;
  }
  //const hasHiddenBlocks = wordCount(chapter, true) !== wordCount(chapter);

  return (
    <div className="flex flex-col my-sm">
      <h3 className="text-xl font-semibold inline">
        <span
          className={`text-4xl font-semibold font-georgia italic inline mr-1 -leading-2 ${colors.secondaryTextColor}`}
        >
          {index}.
        </span>
        <span className="mb-xs">
          {chapter.title} {status}
        </span>
      </h3>
      <Link to={`/book/${bookid}/chapter/${chapter.chapterid}`}>
        <p
          className={`${colors.secondaryTextColor} text-lg px-sm mt-sm font-sans line-clamp-3 tracking-wide leading-8 cursor-pointer`}
        >
          {getChapterText(chapter).slice(0, 350)}
        </p>
      </Link>
      <div className="flex flex-row justify-end">
        {/*   <p className="text-sm font-sans text-gray-500">
          {wordCount(chapter)} words{" "}
          {hasHiddenBlocks && <span>({wordCount(chapter, true)} total)</span>} |{" "}
        </p> */}
        {/* <p
          className={`text-md px-sm mt-md font-sans ${colors.secondaryTextColor}`}
        >
          Last edited: {prettyDate(chapter.created_at)}
        </p> */}

        <Button
          onClick={() => {
            // @ts-ignore
            window.plausible("bookeditor-chapter-edit-button-click");
            navigate(`/book/${bookid}/chapter/${chapter.chapterid}`);
          }}
          className="mt-sm w-20 mr-sm"
          style="secondary"
          size="small"
        >
          Edit
        </Button>
        <Button onClick={_deleteChapter} className="mt-sm w-20" size="small">
          Delete
        </Button>
      </div>
    </div>
  );
}

function Block({ block, chapter, bookid, index }) {
  const navigate = useNavigate();
  const colors = useColors();
  return (
    <Link
      className={`flex flex-col my-sm ${colors.selectedBackground} rounded-md p-sm pb-md cursor-pointer`}
      to={`/book/${bookid}/chapter/${chapter.chapterid}/${index}`}
    >
      <h3 className="text-xl font-semibold mb-sm">
        {chapter.title}
        <span className={`${colors.secondaryTextColor}`}>/{index}</span>
      </h3>
      <pre className="text-gray-800 dark:text-gray-300 font-sans px-xs">
        "{block.text.substring(0, 250)}"
      </pre>
    </Link>
  );
}

function formatDate(date: number) {
  return new Date(date).toLocaleString();
}

function TrainingData({ book }: { book: Book }) {
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState(null);
  const dispatch = useDispatch();
  const trained = !!book.lastTrainedAt;
  const buttonLabel = trained ? "Re-Train" : "Train";
  const fudgeFactor = 1000 * 3; // 3 seconds
  const staleChapters = book.chapters.filter(
    (chapter) =>
      !chapter.embeddingsLastCalculatedAt ||
      chapter.created_at > chapter.embeddingsLastCalculatedAt + fudgeFactor
  );
  const stale = staleChapters.length > 0;
  return (
    <div>
      {trained && (
        <div className="flex flex-col my-sm bg-gray-200 dark:bg-gray-700 rounded-md p-sm">
          <div className="">Last Trained</div>
          <div className="font-semibold">{formatDate(book.lastTrainedAt)}</div>
        </div>
      )}
      {!trained && <p>Never Trained</p>}
      {trained && stale && (
        <p className="bg-yellow-200 dark:bg-yellow-700 p-xs my-xs text-lg">
          Stale
        </p>
      )}
      <ul className="text-md list-disc">
        {trained &&
          stale &&
          staleChapters.map((chapter, i) => (
            <li key={i}>
              <Link
                to={`/book/${book.bookid}/chapter/${chapter.chapterid}`}
                className=""
              >
                {chapter.title} (last updated: {formatDate(chapter.created_at)},
                last trained: {formatDate(chapter.embeddingsLastCalculatedAt)} )
              </Link>
            </li>
          ))}
      </ul>

      <Button
        onClick={async () => {
          const lastTrainedAt = await fd.trainOnBook(book.bookid);
          if (lastTrainedAt.tag === "success") {
            dispatch(
              librarySlice.actions.setLastTrainedAt(lastTrainedAt.payload)
            );
          } else {
            dispatch(librarySlice.actions.setError(lastTrainedAt.message));
          }
        }}
        className="mt-sm"
        size="medium"
        style="secondary"
        rounded={true}
      >
        {buttonLabel}
      </Button>
      <h2 className="text-xl font-semibold mt-md mb-xs">Ask a question</h2>
      <div className="flex flex-col my-sm bg-gray-200 dark:bg-gray-700 rounded-md p-sm">
        <Input
          name="question"
          title="Question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          selector={`question`}
        />
        <Button
          onClick={async () => {
            setAnswer("...");
            const _answer = await fd.askQuestion(book.bookid, question);
            if (_answer.tag === "success") {
              setAnswer(_answer.payload);
            } else {
              dispatch(librarySlice.actions.setError(_answer.message));
            }
          }}
          className="mt-sm"
          size="medium"
          style="secondary"
          rounded={true}
        >
          Ask
        </Button>
        <div className="mt-sm">
          <h2 className="text-xl font-semibold mt-md mb-xs">Answer</h2>
          {answer && isString(answer) && <p>{answer}</p>}
          {answer && answer.answer && (
            <div className="flex flex-col my-sm bg-gray-200 dark:bg-gray-700 rounded-md p-sm">
              <p>{answer.answer}</p>
              <Link
                to={`/book/${book.bookid}/chapter/${answer.chapterid}/${answer.blockIndex}`}
                className="mt-sm underline-offset-2 underline text-gray-400"
              >
                Go to relevant text
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* function CompostBook() {
  const book = useSelector(getSelectedBook);
  return (
    <div className="mx-auto px-sm lg:px-md mt-0 h-full w-full">
      <h1 className="text-2xl mb-sm tracking-wide font-semibold text-darkest dark:text-lightest">
        Compost Heap
      </h1>
      <a
        href="https://egonschiele.github.io/chisel-docs/docs/advanced-features/compost"
        className="uppercase text-sm underline-offset-2 underline text-gray-400 "
      >
        What is a compost heap?
      </a>
      <div className="grid gap-sm grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
        {book.chapters &&
          book.chapters.map((chapter, i) => (
            <Chapter
              key={i}
              chapter={chapter}
              bookid={book.bookid}
              index={i + 1}
            />
          ))}
      </div>
    </div>
  );
} */

function CoverImage({
  book,
  className = "",
}: {
  book: Book;
  className?: string;
}) {
  const dispatch = useDispatch();
  const [url, setUrl] = React.useState(book.coverImageUrl);
  const [editing, setEditing] = React.useState(false);

  async function handleUpload(x) {
    const files = x.target.files;
    // @ts-ignore
    window.plausible("bookeditor-coverimage-upload");
    [...files].forEach(async (file, i) => {
      const res = await fd.upload(file);
      if (res.tag === "success") {
        const { s3key } = res.payload;
        const imageUrl = "/image/" + s3key;
        setUrl(imageUrl);
        dispatch(librarySlice.actions.setCoverImageUrl(imageUrl));
        setEditing(false);
      }
    });
  }

  if (!book.coverImageUrl && !editing) {
    return (
      <div className={`flex h-min justify-center align-middle ${className}`}>
        <Button
          onClick={() => {
            setEditing(true);
          }}
        >
          Add Cover Image
        </Button>
      </div>
    );
  }
  if (editing) {
    return (
      <div className={` ${className}`}>
        <Input
          name="url"
          title="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="grid grid-cols-1 gap-sm">
          <Button
            onClick={() => {
              dispatch(librarySlice.actions.setCoverImageUrl(url));
              setEditing(false);
            }}
            style="secondary"
          >
            Save Cover Image
          </Button>
          <Button
            onClick={() => {
              setEditing(false);
            }}
          >
            Cancel
          </Button>
          <input
            type="file"
            id="imgupload"
            key="upload"
            multiple={false}
            onChange={handleUpload}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={` ${className}`}>
      <img
        src={book.coverImageUrl}
        className="object-cover h-full col-span-2 mb-sm mx-auto"
        loading="lazy"
      />
      <div className="w-full flex justify-end">
        <Button onClick={() => setEditing(true)}>Edit</Button>
      </div>
    </div>
  );
}

function Heading({ text, className = "", children = null }) {
  const colors = useColors();
  return (
    <div className="text-xl font-semibold mt-[4rem] w-full mb-xs">
      <div
        className={`text-2xl font-semibold mb-xs w-full uppercase pb-sm relative text-center tracking-[1em] border-b-2 ${colors.selectedBorderColor} ${className}`}
      >
        {text}
        {children}
      </div>
    </div>
  );
}

function Tag({ tag, className = "", onClick = null }) {
  const colors = useColors();
  return (
    <div
      className={`${colors.backgroundAlt} ${colors.primaryTextColor} border ${colors.selectedBorderColor} rounded-md text-sm px-2 py-1 mr-xs h-full ${className}`}
      onClick={onClick}
    >
      {tag}
    </div>
  );
}

function Tags() {
  const book = useSelector(getSelectedBook);
  const tags = useSelector(getAllTags);
  const [editing, setEditing] = React.useState(false);
  const dispatch = useDispatch();
  const { settings, saveBook } = useContext(
    LibraryContext
  ) as t.LibraryContextType;
  const colors = useColors();

  if (editing) {
    return (
      <div className="flex w-full">
        <div className="w-96 mx-auto grid grid-cols-1">
          <div className="flex">
            <label
              htmlFor={"tags"}
              className={`settings_label flex-none mr-xs my-auto`}
            >
              Tags
            </label>
            <Input
              name="tags"
              className="flex-grow mr-sm"
              divClassName=""
              value={book.tags || ""}
              onChange={(e) => {
                dispatch(librarySlice.actions.setBookTags(e.target.value));
              }}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  setEditing(false);
                  await saveBook(book);
                }
              }}
            />

            <Button
              onClick={async () => {
                setEditing(false);
                await saveBook(book);
              }}
              size="small"
              className="flex-none h-full"
            >
              Done
            </Button>
          </div>
          <div className="flex mt-sm">
            {tags.map((tag) => (
              <Tag
                tag={tag}
                key={tag}
                className="cursor-pointer"
                onClick={() => {
                  const currentTags = getTags(book.tags);
                  if (!currentTags.includes(tag)) {
                    dispatch(
                      librarySlice.actions.setBookTags(
                        [...currentTags, tag].join(", ")
                      )
                    );
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  } else {
    return (
      <div className="flex w-full">
        <div className="flex mx-auto">
          <div className="flex flex-wrap">
            {book.tags &&
              getTags(book.tags).map((tag) => <Tag tag={tag} key={tag} />)}
          </div>
          <Button size="small" onClick={() => setEditing(true)}>
            Edit Tags
          </Button>
        </div>
      </div>
    );
  }
}

export default function BookEditor({ className = "" }) {
  const book = useSelector(getSelectedBook);
  const chapters = useSelector(getSelectedBookChapters);
  const writingStreak = useSelector(getSelectedBookWritingStreak);
  const encryptionPassword: string | null = useSelector(
    (state: RootState) => state.library.encryptionPassword
  );
  const { fontClass, fontSizeClass, titleFontSize } = useFonts();

  const dispatch = useDispatch();
  const bookEditorDiv = useRef(null);
  const { settings, saveBook, setLoading, newChapter } = useContext(
    LibraryContext
  ) as t.LibraryContextType;
  const uploadFileRef = React.useRef<HTMLInputElement>(null);
  const uploadAudioRef = React.useRef<HTMLInputElement>(null);

  const colors = useColors();
  const { scrollTop } = useParams();
  useEffect(() => {
    if (!bookEditorDiv.current) return;
    if (!scrollTop) return;
    bookEditorDiv.current.scroll({ top: scrollTop });
  }, [scrollTop]);

  useEffect(() => {
    if (!bookEditorDiv.current) return;
    bookEditorDiv.current.addEventListener("scroll", (e) => {
      dispatch(
        librarySlice.actions.updateTab({
          tag: "book",
          bookid: book.bookid,
          scrollTop: bookEditorDiv.current.scrollTop,
        })
      );
    });
  }, [bookEditorDiv.current]);

  let referenceBlocks = [];
  const chapterHashes = {};
  if (chapters) {
    chapters.forEach((chapter) => {
      chapter.text.forEach((block, index) => {
        if (block.reference) {
          referenceBlocks.push({ block, index, chapter });
        }
      });
      const markdown = chapterToMarkdown(chapter);
      if (markdown.trim() !== "") {
        const key = md5(markdown.trim());
        if (chapterHashes[key]) {
          chapterHashes[key].push(chapter);
        } else {
          chapterHashes[key] = [chapter];
        }
      }
    });
  }

  const dupes = [];
  for (const key in chapterHashes) {
    if (chapterHashes[key].length > 1) {
      dupes.push(chapterHashes[key]);
    }
  }

  function handleUpload(x) {
    const files = x.target.files;
    [...files].forEach(async (file, i) => {
      let text = await file.text();
      if (encryptionPassword !== null) {
        text = encryptMessage(text, encryptionPassword);
      }
      await newChapter(file.name, text);
    });
  }

  async function handleAudioUpload(x) {
    setLoading(true);
    const files = x.target.files;
    const promises = [...files].map(async (file, i) => {
      const response = await fd.uploadAudio(file);
      if (response.tag === "success") {
        const { text } = response.payload;
        await newChapter(file.name, text);
      } else {
        dispatch(librarySlice.actions.setError(response.message));
      }
    });
    await Promise.all(promises);
    setLoading(false);
  }

  if (!book) {
    return <div>loading</div>;
  }

  return (
    <div
      className={`flex h-screen overflow-auto w-full mx-auto pt-lg ${className}`}
      id="bookeditor"
      ref={bookEditorDiv}
    >
      <div className=" px-sm lg:px-md h-screen w-[40rem] xl:w-[50rem] 2xl:w-[60rem]">
        <ContentEditable
          value={book.title}
          className="text-6xl mb-sm tracking-wide w-full text-center font-semibold text-darkest dark:text-lightest"
          onSubmit={async (title) => {
            dispatch(librarySlice.actions.setBookTitle(title));
            await saveBook(book);
          }}
          nextFocus={() => {}}
          selector="book-editor-title"
        />

        <QuillTextArea
          bookid={book.bookid}
          value={book.synopsis || ""}
          onChange={(value) => {
            dispatch(librarySlice.actions.setBookSynopsis(value));
          }}
          title="Synopsis"
          inputClassName={`typography border-0 bg-editor text-editortext dark:bg-dmeditor dark:text-dmeditortext resize-none  ${fontSizeClass}`}
        />

        {/* <CoverImage book={book} className="mt-lg" /> */}
        {/* this (bookinfo) was causing a lot of re-renderings when editing a tag or character */}
        {/* <BookInfo book={book} /> */}
        {/* <CalendarWidget writingStreak={writingStreak} /> */}
        <input
          type="file"
          id="imgupload"
          className="hidden"
          key="upload"
          ref={uploadFileRef}
          multiple={true}
          onChange={handleUpload}
        />

        <input
          type="file"
          id="audioupload"
          className="hidden"
          key="audioupload"
          ref={uploadAudioRef}
          multiple={true}
          onChange={handleAudioUpload}
        />
        <div className={`grid gap-md grid-cols-1 mt-md`}>
          <div className="grid gap-sm grid-cols-1 ">
            <Heading text={`${pluralize(chapters.length, "Chapter")}`}>
              <Button
                onClick={() => {
                  // @ts-ignore
                  window.plausible("bookeditor-chapter-add-button-click");
                  newChapter("New chapter");
                  //if (uploadFileRef.current) uploadFileRef.current.click();
                }}
                rounded={true}
                className="ml-xs mb-xs absolute right-0 top-0"
                size="small"
                selector="add-chapter-button"
              >
                Add Chapter
              </Button>
              {settings.admin && (
                <Button
                  onClick={() => {
                    // @ts-ignore
                    window.plausible("bookeditor-chapter-import-audio-click");
                    if (uploadAudioRef.current) uploadAudioRef.current.click();
                  }}
                  rounded={true}
                  className="ml-xs mb-xs absolute left-0 top-0"
                  size="small"
                  selector="import-audio-button"
                >
                  Import Audio
                </Button>
              )}
            </Heading>
            {chapters &&
              chapters.map((chapter, i) => (
                <Chapter
                  key={i}
                  chapter={chapter}
                  bookid={book.bookid}
                  index={i + 1}
                />
              ))}
          </div>
        </div>
        <Heading
          className={`${
            book.characters && book.characters.length > 0
              ? colors.primaryTextColor
              : colors.secondaryTextColor
          }`}
          text="Starring"
        >
          <Button
            onClick={() => {
              // @ts-ignore
              window.plausible("bookeditor-character-add-button-click");
              dispatch(librarySlice.actions.addCharacter());
            }}
            rounded={true}
            className="ml-xs mb-xs absolute right-0 top-0"
            size="small"
            selector="add-character-button"
          >
            Add Character
          </Button>
        </Heading>

        {!book.characters ||
          (book.characters.length == 0 && (
            <p
              className={`${colors.secondaryTextColor} w-full text-center text-lg mt-xl`}
            >
              No one.
            </p>
          ))}

        <div className="grid gap-md grid-cols-3 mt-xl">
          {book.characters &&
            book.characters.map((character, i) => (
              <Character
                key={i}
                character={character}
                onNameChange={(newName) =>
                  dispatch(
                    librarySlice.actions.editCharacter({
                      index: i,
                      character: { ...character, name: newName },
                    })
                  )
                }
                onAliasesChange={(newAliases) =>
                  dispatch(
                    librarySlice.actions.editCharacter({
                      index: i,
                      character: { ...character, aliases: newAliases },
                    })
                  )
                }
                onDescChange={(newDesc) =>
                  dispatch(
                    librarySlice.actions.editCharacter({
                      index: i,
                      character: { ...character, description: newDesc },
                    })
                  )
                }
                onImageUrlChange={(newImageUrl) =>
                  dispatch(
                    librarySlice.actions.editCharacter({
                      index: i,
                      character: { ...character, imageUrl: newImageUrl },
                    })
                  )
                }
                onDelete={() => {
                  dispatch(librarySlice.actions.deleteCharacter({ index: i }));
                }}
              />
            ))}
        </div>

        {referenceBlocks.length > 0 && (
          <Heading
            text={`${referenceBlocks.length} pinned ${
              referenceBlocks.length === 1 ? "block" : "blocks"
            }`}
          />
        )}

        <div className="grid gap-md grid-cols-3 mt-lg mb-[50rem]">
          {referenceBlocks.map(({ block, chapter, index }, i) => (
            <Block
              key={i}
              block={block}
              index={index}
              chapter={chapter}
              bookid={book.bookid}
            />
          ))}
        </div>
        {dupes.length > 0 && (
          <>
            <div className="text-xl font-semibold mt-md mb-xs">
              <span>Duplicates</span>
            </div>
            <p>The following chapters are duplicates of each other:</p>
            <div className="grid gap-sm grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
              {dupes.map((chapters, i) => (
                <ul
                  key={i}
                  className="list-decimal border border-gray-500 p-sm rounded-md my-sm text-md"
                >
                  {chapters.map((chapter, j) => (
                    <li key={j} className="ml-md">
                      <Link
                        to={`/book/${chapter.bookid}/chapter/${chapter.chapterid}`}
                      >
                        {chapter.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </>
        )}
        <Tags />

        <div className="text-xl font-semibold mt-md mb-xs">
          <span>Training</span>
        </div>
        <div className="grid gap-sm grid-cols-1 md:grid-cols-2 2xl:grid-cols-3">
          <TrainingData book={book} />
        </div>
        {/* bottom padding */}
        <div className="h-24" />
      </div>
    </div>
  );
}

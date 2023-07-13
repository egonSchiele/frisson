import * as fd from "./lib/fetchData";
import InfoSection from "./components/InfoSection";
import RadioGroup from "./components/RadioGroup";

import React, { useContext, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import LibraryContext from "./LibraryContext";
import * as t from "./Types";
import Button from "./components/Button";
import List from "./components/List";
import Switch from "./components/Switch";
import {
  getSelectedBook,
  getText,
  librarySlice,
} from "./reducers/librarySlice";
import { RootState } from "./store";

import Input from "./components/Input";
import Select from "./components/Select";
import { languages } from "./lib/languages";
import BlockActionsSidebar from "./BlockActionsSidebar";
import { useColors } from "./lib/hooks";

function BlockVersions({
  versions,
  setVersions,
}: {
  versions: string;
  setVersions: any;
}) {
  return (
    <div className="mt-sm">
      <h3 className="text-xl font-semibold">Versions</h3>
    </div>
  );
}

function BlockCaption({
  caption,
  setCaption,
}: {
  caption: string | null;
  setCaption: any;
}) {
  const [_caption, _setCaption] = useState(caption);
  if (!caption) {
    return (
      <>
        <label className="settings_label mt-sm">Caption</label>
        <Button
          style="secondary"
          size="medium"
          rounded={true}
          onClick={() => setCaption("new caption")}
          className="w-full my-xs"
        >
          Add Caption
        </Button>
      </>
    );
  } else {
    return (
      <>
        <label className="settings_label mt-sm">Caption</label>

        <div className="grid grid-cols-1">
          <Input
            className="w-full"
            type="text"
            value={_caption}
            onChange={(e) => _setCaption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setCaption(_caption);
              }
            }}
          />
          <Button
            style="secondary"
            size="medium"
            rounded={true}
            onClick={() => setCaption(_caption)}
            className="w-full mb-xs"
          >
            Save
          </Button>
          <Button
            style="primary"
            size="medium"
            rounded={true}
            onClick={() => setCaption(null)}
            className="w-full"
          >
            Remove Caption
          </Button>
        </div>
      </>
    );
  }
}
function BlockLanguage({
  language,
  setLanguage,
}: {
  language: string;
  setLanguage: any;
}) {
  return (
    <div className="mt-sm">
      <Select
        title="Language"
        name="language"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        {languages.map((language) => (
          <option key={language} value={language}>
            {language}
          </option>
        ))}
      </Select>
    </div>
  );
}
function BlockType({ type, setType }: { type: t.BlockType; setType: any }) {
  const options = [
    { type: "plain", label: "Plain" },
    { type: "markdown", label: "Markdown" },
    { type: "code", label: "Code" },
    { type: "embeddedText", label: "Embedded Text" },
    { type: "todoList", label: "Todo List" },
    { type: "image", label: "Image" },
  ];
  return (
    <RadioGroup
      value={type}
      onChange={setType}
      className={"grid grid-cols-1"}
      label="Type"
      options={options}
    />
  );
}

function BlockImageDisplay({
  display,
  setDisplay,
}: {
  display: t.ImageDisplay;
  setDisplay: any;
}) {
  const options = [
    { type: "linear", label: "Linear" },
    { type: "grid", label: "Grid" },
  ];
  return (
    <div className=" my-sm">
      <RadioGroup
        value={display}
        onChange={setDisplay}
        className={"grid grid-cols-1"}
        label="Type"
        options={options}
      />
    </div>
  );
}

function BlockImageUpload({ addImageUrl }: { addImageUrl: any }) {
  const { setLoading } = useContext(LibraryContext) as t.LibraryContextType;
  async function handleUpload(x) {
    const files = x.target.files;
    // @ts-ignore
    window.plausible("block-info-image-upload");
    setLoading(true);
    const promises = [...files].map(async (file, i) => {
      const res = await fd.upload(file);
      if (res.tag === "success") {
        const { s3key } = res.payload;
        const imageUrl = "/image/" + s3key;

        addImageUrl(imageUrl);
      }
    });
    await Promise.all(promises);
    setLoading(false);
  }

  return (
    <div className=" my-sm">
      <label className="settings_label my-xs">Upload Images</label>
      <input
        type="file"
        id="imgupload"
        key="upload"
        accept="image/*"
        multiple={true}
        onChange={handleUpload}
      />
    </div>
  );
}

function BlockPreview({ currentText }: { currentText: t.TextBlock }) {
  let text = currentText.text;
  if (currentText.caption) {
    text = currentText.caption;
  }
  text = text.substring(0, 100);
  return (
    <div
      className={`my-sm p-xs bg-gray-200 dark:bg-gray-800 ${
        currentText.open
          ? "text-gray-900 dark:text-gray-300"
          : "text-gray-700 dark:text-gray-500"
      }`}
    >
      <div className="text-xs line-clamp-2">{text}</div>
    </div>
  );
}
function BlockInfo({ currentText }: { currentText: t.TextBlock }) {
  return <InfoSection text={currentText.text} />;
}
let lineCount = 0;
const line = () => (
  <li key={`line${lineCount++}`}>
    <div className="my-sm w-full bg-gray-800 text-gray-500">
      <hr className="border-gray-500" />
    </div>
  </li>
);

export default function BlockInfoSidebar({}: {}) {
  const state = useSelector((state: RootState) => state.library.editor);
  const currentBook = useSelector(getSelectedBook);
  const currentText = useSelector(getText(state.activeTextIndex));
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const { settings } = useContext(LibraryContext) as t.LibraryContextType;
  const colors = useColors();
  if (!currentText) return null;

  const listItems: any[] = [
    <li key="preview">
      <BlockPreview currentText={currentText} />
    </li>,
    <li key="info">
      <BlockInfo currentText={currentText} />
    </li>,
  ];
  if (currentText.open) {
    listItems.push(
      <li key="close">
        <Button
          style="primary"
          size="medium"
          rounded={true}
          onClick={() =>
            dispatch(librarySlice.actions.closeBlock(state.activeTextIndex))
          }
          className="w-full my-sm"
        >
          Close Block
        </Button>
      </li>
    );
  } else {
    listItems.push(
      <li key="open">
        <Button
          style="primary"
          size="medium"
          rounded={true}
          onClick={() =>
            dispatch(librarySlice.actions.openBlock(state.activeTextIndex))
          }
          className="w-full my-sm"
        >
          Open Block
        </Button>
      </li>
    );
  }
  listItems.push(line());
  listItems.push(
    <li key="type">
      <BlockType
        type={currentText.type}
        setType={(newType) =>
          dispatch(
            librarySlice.actions.setBlockType({
              index: state.activeTextIndex,
              type: newType,
            })
          )
        }
      />
    </li>
  );

  if (currentText.type === "code") {
    listItems.push(
      <li key="language">
        <BlockLanguage
          language={currentText.language as string}
          setLanguage={(newLanguage) => {
            console.log({ newLanguage });
            dispatch(
              librarySlice.actions.setLanguage({
                index: state.activeTextIndex,
                language: newLanguage,
              })
            );
          }}
        />
      </li>
    );
  }

  if (currentText.type === "image") {
    listItems.push(
      <li key="imagedisplay">
        <BlockImageDisplay
          display={currentText.display}
          setDisplay={(newDisplay) => {
            console.log({ newDisplay });
            dispatch(
              librarySlice.actions.setDisplay({
                index: state.activeTextIndex,
                display: newDisplay,
              })
            );
          }}
        />
      </li>,
      <li key="imageupload">
        <BlockImageUpload
          addImageUrl={(newUrl) => {
            dispatch(librarySlice.actions.addToContents(newUrl));
          }}
        />
      </li>
    );
  }

  listItems.push(
    <li key="reference">
      <Switch
        label="Pin"
        enabled={currentText.reference}
        setEnabled={(enabled) => {
          dispatch(librarySlice.actions.toggleReference(state.activeTextIndex));
          // @ts-ignore
          window.plausible("block-info-pin", { props: { enabled } });
        }}
        divClassName="mt-sm"
      />
    </li>
  );

  listItems.push(
    <li key="hideInExport">
      <Switch
        label="Hide in Export"
        enabled={currentText.hideInExport}
        setEnabled={(enabled) => {
          dispatch(
            librarySlice.actions.toggleHideInExport(state.activeTextIndex)
          );
          // @ts-ignore
          window.plausible("block-info-hide-in-export", { props: { enabled } });
        }}
        divClassName="mt-sm"
      />
    </li>
  );

  listItems.push(
    <li key="caption">
      <BlockCaption
        // @ts-ignore
        caption={currentText.caption}
        setCaption={(newCaption) => {
          dispatch(
            librarySlice.actions.addCaption({
              index: state.activeTextIndex,
              caption: newCaption,
            })
          );
          // @ts-ignore
          window.plausible("block-info-add-caption");
        }}
      />
    </li>
  );
  listItems.push(line());

  listItems.push(
    <li key="actions">
      <BlockActionsSidebar />
    </li>
  );

  return (
    <List
      title="Block Info"
      items={listItems}
      leftMenuItem={null}
      rightMenuItem={null}
      className={`${colors.background} border-r ${colors.borderColor}`}
      selector="blockInfoList"
    />
  );
}

import * as t from "./Types";
import Input from "./components/Input";
import * as fd from "./lib/fetchData";
import React, { useContext } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { EditorState, LibraryContextType } from "./Types";
import Button from "./components/Button";
import List from "./components/List";
import ListItem from "./components/ListItem";
import sortBy from "lodash/sortBy";

import {
  getSelectedBook,
  getSelectedChapter,
  getText,
  librarySlice,
} from "./reducers/librarySlice";
import { RootState } from "./store";
import { text } from "express";
import LibraryContext from "./LibraryContext";
import Spinner from "./components/Spinner";
import { prettyDate, useLocalStorage } from "./utils";
import TextArea from "./components/TextArea";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useColors } from "./lib/hooks";

function Chat({ role, content, className = null }) {
  return (
    <div
      className={`py-xs px-sm text-lg mb-sm rounded ${
        role === "user" ? "bg-gray-800" : "bg-gray-600"
      } ${className}`}
    >
      {content}
    </div>
  );
}

function Reveal({ label, children, showCopy = false }) {
  const [show, setShow] = React.useState(false);
  const buttonLabel = show ? `Hide ${label}` : `Show ${label}`;
  return (
    <div className="grid grid-cols-1 w-full m-xs">
      <Button
        style="secondary"
        onClick={() => setShow(!show)}
        className="mb-sm w-48"
      >
        {buttonLabel}
      </Button>
      {show && showCopy && (
        <Button
          style="secondary"
          onClick={() => navigator.clipboard.writeText(children)}
          className="mb-sm w-48"
        >
          Copy to Clipboard
        </Button>
      )}
      {show && <div>{children}</div>}
    </div>
  );
}

async function lastEdited() {
  const lastEditedRequest = new Request("/api/lastEdited", {
    credentials: "include",
  });

  const cache = await caches.open("v1");
  const lastEditedResponse = await cache.match(lastEditedRequest);
  if (lastEditedResponse) {
    return await lastEditedResponse.json();
  } else {
    return null;
  }
}

const lastEditedResponse = await lastEdited();
const lastEditedTimestamp = lastEditedResponse
  ? new Date(lastEditedResponse.lastEdited).toString()
  : null;

async function cacheData() {
  const booksRequest = new Request("/api/books", {
    credentials: "include",
  });

  const cache = await caches.open("v1");
  const cachedBookData = await cache.match(booksRequest);
  if (!cachedBookData) {
    return null;
  }
  const data = await cachedBookData.json();
  return data;
}

const dataInCache = await cacheData();

async function backupCacheData() {
  const cache = await caches.open("v1");
  const cachedBookData = await cache.match("/api/books/backup");
  if (!cachedBookData) {
    return null;
  }
  const data = await cachedBookData.json();
  return data;
}

const backupDataInCache = await backupCacheData();

function clearCache() {
  caches.keys().then(function (names) {
    for (let name of names) caches.delete(name);
  });
}

function ViewportSize() {
  return (
    <div className="text-sm mx-xs my-xs">
      Viewport:
      <span className="invisible sm:visible md:invisible">sm</span>
      <span className="invisible md:visible lg:invisible">md</span>
      <span className="invisible lg:visible xl:invisible">lg</span>
      <span className="invisible xl:visible 2xl:invisible">xl</span>
      <span className="invisible 2xl:visible">2xl and above</span>
    </div>
  );
}

function Notifications({ notifications }: { notifications: t.Notification[] }) {
  return (
    <div className="text-sm mx-xs my-xs">
      Notifications:
      {notifications.map((notification, i) => {
        const color =
          notification.type === "error" ? "text-red-700" : "text-green-700";
        return (
          <div key={i} className="my-xs">
            <p className={`text-md ${color}`}>
              {i + 1}. {notification.message}
            </p>
            <p className="text-xs text-gray-500">
              {prettyDate(notification.created_at)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export default function DebugSidebar() {
  const state: t.State = useSelector((state: RootState) => state.library);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { settings, setLoading } = useContext(
    LibraryContext
  ) as LibraryContextType;
  const colors = useColors();

  const line = (str) => (
    <ListItem title={str} key={str} className="w-full" selected={false} />
  );

  const pretty = (obj) => JSON.stringify(obj, null, 2);

  const items: any[] = [
    line(`Online? ${state.online}`),
    line(`Service worker running? ${state.serviceWorkerRunning}`),
    line(`From cache? ${state.fromCache}`),
    line(`Last edited raw: ${pretty(lastEditedResponse)}`),
    line(`Last edited as timestamp: ${pretty(lastEditedTimestamp)}`),
    <ViewportSize key="viewportSize" />,
    <Reveal label="Settings" showCopy={true} key="settings">
      {pretty(settings)}
    </Reveal>,
    <Reveal label="State" showCopy={true} key="state">
      {pretty(state)}
    </Reveal>,
    ,
    <Reveal
      label={`Data in Cache ${dataInCache ? "" : "(none)"}`}
      showCopy={true}
      key="cacheData"
    >
      {pretty(dataInCache)}
    </Reveal>,
    <Reveal
      label={`Backup Data in Cache ${backupDataInCache ? "" : "(none)"}`}
      showCopy={true}
      key="backupCacheData"
    >
      {pretty(backupDataInCache)}
    </Reveal>,
    ,
    <Button
      style="primary"
      onClick={() => {
        setLoading(true);
        clearCache();
        setLoading(false);
      }}
      key="clearCache"
      className="ml-xs mb-sm"
    >
      Clear Cache
    </Button>,
    <Reveal label="Notifications log" key="notifications">
      <Notifications notifications={state.notifications} />
    </Reveal>,
  ];

  return (
    <List
      title="Debug"
      items={items}
      leftMenuItem={null}
      rightMenuItem={null}
      className="border-r w-full"
      selector="debugList"
      showScrollbar={false}
    />
  );
}

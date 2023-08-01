import React, { MouseEventHandler } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BoltIcon, XMarkIcon } from "@heroicons/react/24/outline";
import * as t from "../Types";
import ListMenu from "./ListMenu";
import { useColors } from "../lib/hooks";

export default function ListItem({
  title,
  selected,
  link = null,
  menuItems = [],
  selector = "listitem",
  tag = null,
  content = "",
  className = "",
  contentClassName = "",
  plausibleEventName = "",
  onClick = null,
  onMouseEnter = () => {},
  onMouseLeave = () => {},
}: {
  title: string;
  selected: boolean;
  link?: string | null;
  menuItems?: t.MenuItem[];
  selector?: string;
  tag?: string | null;
  content?: string;
  className?: string;
  contentClassName?: string;
  plausibleEventName?: string;
  onClick?: MouseEventHandler<HTMLDivElement> | undefined | null;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: MouseEventHandler<HTMLDivElement>;
}) {
  const navigate = useNavigate();
  const colors = useColors();

  const selectedCss = selected
    ? `border-l-4 ${colors.selectedBorderColor}`
    : "";
  let plausibleEventNameCss = "";
  if (plausibleEventName) {
    plausibleEventNameCss = `plausible-event-name=${plausibleEventName}`;
    plausibleEventNameCss += ` plausible-event-title=${title}`;
  }

  const itemToWrap = (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`flex flex-grow items-center overflow-hidden py-xs mr-xs cursor-pointer ${plausibleEventNameCss}`}
      data-selector={`${selector}-list-item-link`}
    >
      {!content && (
        <div className="w-full">
          <p
            className="px-xs overflow-hidden text-ellipsis break-words flex content-start"
            data-selector={`${selector}-list-item`}
          >
            {tag === "compost" && (
              <BoltIcon className="w-5 h-5 flex-grow mr-xs" />
            )}{" "}
            <span
              className={`flex-grow w-full text-lg md:text-sm ${className}`}
            >
              {title}
            </span>
          </p>
        </div>
      )}
      {content && (
        <div className="w-full py-xs">
          <p
            className={`px-xs overflow-hidden text-sm xl:text-md text-ellipsis break-words font-bold ${className}`}
            data-selector={`${selector}-list-item`}
          >
            {title}
          </p>
          <p
            className={`px-xs mt-1 ${colors.secondaryTextColor} line-clamp-2 leading-6 text-ellipsis ${contentClassName}`}
          >
            {content}
          </p>
        </div>
      )}
    </div>
  );

  const wrappedItem = link ? (
    <Link to={link} className={`flex flex-grow`}>
      {itemToWrap}
    </Link>
  ) : (
    itemToWrap
  );

  return (
    <div
      className={`flex  w-full ${colors.primaryTextColor} text-sm xl:text-md items-center ${colors.itemHover} ${selectedCss} `}
    >
      {wrappedItem}
      {/* {tag !== "compost" && menuItems.length > 0 && (
        <div className="flex flex-none cursor-pointer items-center mr-xs">
          <ListMenu
            items={menuItems}
            selector={selector}
            className="-translate-x-3/4"
          />
        </div>
      )} */}
    </div>
  );
}

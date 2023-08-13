import React, { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { ChevronDownIcon } from "@heroicons/react/20/solid";
import {
  CheckIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";
import { MenuItem, blockTypes } from "./Types";
import ListMenu from "./components/ListMenu";
import { useDispatch } from "react-redux";
import { librarySlice } from "./reducers/librarySlice";
import { languages } from "./lib/languages";
import Tag from "./components/Tag";
export default function CodeMenu({ currentText, index }) {
  const dispatch = useDispatch();
  const items: MenuItem[] = [];

  languages.forEach((language) => {
    let icon = <div className="w-5 h-5" aria-hidden="true" />;
    if (currentText.language === language) {
      icon = <CheckIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />;
    }
    items.push({
      label: language,
      onClick: () => {
        dispatch(
          librarySlice.actions.setLanguage({
            index,
            language,
          })
        );
      },
      icon,
    });
  });

  return (
    <ListMenu items={items} icon={<Tag letter="C" className="w-5 h-5" />} />
  );
}

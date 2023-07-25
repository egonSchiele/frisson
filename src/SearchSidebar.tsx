import {
  Bars3Icon,
  ComputerDesktopIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  Square2StackIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getText, librarySlice } from "./reducers/librarySlice";
import { RootState } from "./store";

import { Tab } from "@headlessui/react";
import BlockActionsSidebar from "./BlockActionsSidebar";
import BlockInfoSidebar from "./BlockInfoSidebar";
import OutlineSidebar from "./OutlineSidebar";
import VersionsSidebar from "./VersionsSidebar";
import { useColors } from "./lib/hooks";
import SimpleSearchSidebar from "./SimpleSearchSidebar";
import AskAQuestionSidebar from "./AskAQuestionSidebar";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SearchSidebar({}: {}) {
  //const [selectedIndex, setSelectedIndex] = useState(tabIndex);

  const state = useSelector((state: RootState) => state.library.editor);
  const index = state.activeTextIndex;
  const dispatch = useDispatch();

  const colors = useColors();

  /*  const tab = useSelector(
    (state: RootState) => state.library.panels.leftSidebar.activePanel
  );
  let selectedIndex = 0;
  if (tab === "versions") selectedIndex = 1;

  function setSelectedIndex(index: number) {
    if (index === 0) {
      dispatch(librarySlice.actions.toggleBlocks());
    } else if (index === 1) {
      dispatch(librarySlice.actions.toggleVersions());
    }
  } */

  const [selectedIndex, setSelectedIndex] = useState(0);

  function getClassNames({ selected }) {
    const defaultClasses = "w-full py-1 text-sm font-medium text-center";
    return classNames(
      defaultClasses,
      selected ? `${colors.background}` : `${colors.selectedBackground}`
    );
  }
  return (
    <div className="w-full px-0">
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className={`flex border-r ${colors.borderColor}`}>
          <Tab className={getClassNames}>
            <MagnifyingGlassIcon
              className={`w-5 h-5 mx-auto ${colors.secondaryTextColor}`}
            />
          </Tab>
          <Tab className={getClassNames}>
            <ComputerDesktopIcon
              className={`w-5 h-5 mx-auto ${colors.secondaryTextColor}`}
            />
          </Tab>
        </Tab.List>
        <Tab.Panels className="">
          <Tab.Panel>
            <SimpleSearchSidebar />
          </Tab.Panel>
          <Tab.Panel>
            <AskAQuestionSidebar />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}

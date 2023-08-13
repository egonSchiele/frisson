import {
  Bars3Icon,
  InformationCircleIcon,
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
import { classNames } from "./utils";

export default function BlockSidebar({}: {}) {
  //const [selectedIndex, setSelectedIndex] = useState(tabIndex);

  const state = useSelector((state: RootState) => state.library.editor);
  const tab = useSelector(
    (state: RootState) => state.library.panels.leftSidebar.activePanel
  );

  const index = state.activeTextIndex;
  const currentText = useSelector(getText(index));
  const colors = useColors();
  const dispatch = useDispatch();

  let selectedIndex = 0;
  if (tab === "versions") selectedIndex = 1;

  function setSelectedIndex(index: number) {
    if (index === 0) {
      dispatch(librarySlice.actions.toggleBlocks());
    } else if (index === 1) {
      dispatch(librarySlice.actions.toggleVersions());
    }
  }

  if (!currentText) return null;
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
            <InformationCircleIcon
              className={`w-5 h-5 mx-auto ${colors.secondaryTextColor}`}
            />
          </Tab>
          <Tab className={getClassNames}>
            <Square2StackIcon
              className={`w-5 h-5 mx-auto ${colors.secondaryTextColor}`}
            />
          </Tab>
        </Tab.List>
        <Tab.Panels className="">
          <Tab.Panel>
            <BlockInfoSidebar />
          </Tab.Panel>
          <Tab.Panel>
            <VersionsSidebar />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}

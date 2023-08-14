import {
  Bars3Icon,
  BeakerIcon,
  BugAntIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { getText } from "./reducers/librarySlice";
import { RootState } from "./store";

import { Tab } from "@headlessui/react";
import BlockActionsSidebar from "./BlockActionsSidebar";
import BlockInfoSidebar from "./BlockInfoSidebar";
import OutlineSidebar from "./OutlineSidebar";
import FocusChecksSidebar from "./FocusChecksSidebar";
import SynonymsSidebar from "./SynonymsSidebar";
import { useColors } from "./lib/hooks";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function FocusSidebar({ tabIndex = 1 }: { tabIndex?: number }) {
  const [selectedIndex, setSelectedIndex] = useState(tabIndex);

  const state = useSelector((state: RootState) => state.library.editor);
  const index = state.activeTextIndex;
  const currentText = useSelector(getText(index));
  const colors = useColors();
  if (!currentText) return null;
  function getClassNames({ selected }) {
    const defaultClasses =
      "w-full py-1 text-sm font-medium text-center focus:outline-none";
    return classNames(
      defaultClasses,
      selected ? colors.selectedBackground : colors.background
    );
  }
  return (
    <div className="w-full px-0">
      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className={`flex border-r ${colors.borderColor}`}>
          <Tab className={getClassNames}>
            <BugAntIcon
              className={`w-5 h-5 mx-auto ${colors.primaryTextColor}`}
            />
          </Tab>
          <Tab className={getClassNames}>
            <BeakerIcon
              className={`w-5 h-5 mx-auto ${colors.primaryTextColor}`}
            />
          </Tab>
        </Tab.List>
        <Tab.Panels className="">
          <Tab.Panel>
            <FocusChecksSidebar />
          </Tab.Panel>
          <Tab.Panel>
            <SynonymsSidebar />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}

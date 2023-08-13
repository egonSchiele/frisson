/* import levenshtein from "js-levenshtein";
import intersection from "lodash/intersection";
 */ import sortBy from "lodash/sortBy";
import { apStyleTitleCase } from "ap-style-title-case";
import React, { Fragment, useState, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { Combobox, Dialog, Transition } from "@headlessui/react";
import { MenuItem } from "../Types";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Launcher({
  items,
  open,
  close,
  onChoose = (m) => {},
  autocompleteCache = {},
}: {
  items: MenuItem[];
  open: boolean;
  close: () => void;
  onChoose?: (m: MenuItem) => void;
  autocompleteCache?: { [key: string]: number };
}) {
  const [query, setQuery] = useState("");

  let filteredItems = items;
  if (query !== "") {
    // @ts-ignore
    filteredItems = items.map((item) => {
      const a = item.label.toLowerCase().split(" ");
      const b = query.toLowerCase().split(" ");

      let matches = 0;
      for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) {
          if (a[i].includes(b[j])) {
            matches++;
          }
        }
      }

      /*  if (item.label === "Convert title to title case") {
        console.log({ a, b, matches });
      } */

      if (matches >= b.length) {
        const frequency = autocompleteCache[item.label] || 0;
        return { ...item, frequency, matchPercentage: matches / a.length };
      } else {
        return null;
      }
    });
    filteredItems = filteredItems.filter((item) => item !== null);

    filteredItems = sortBy(filteredItems, [
      "frequency",
      "matchPercentage",
    ]).reverse();
    /*     filteredItems = sortBy(filteredItems, (item) => {
      return levenshtein(item.label.toLowerCase(), query.toLowerCase());
    }); */
  }

  return (
    <Transition.Root
      show={open}
      as={Fragment}
      afterLeave={() => setQuery("")}
      appear
    >
      <Dialog as="div" className="relative z-10" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-75"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-75"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-75"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-75"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-xl transform divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden rounded-xl bg-white dark:bg-black shadow-2xl ring-1 ring-black ring-opacity-5 transition-all">
              <Combobox
                onChange={(item: MenuItem) => {
                  item.onClick();
                  onChoose(item);
                  if (item.plausibleEventName) {
                    // @ts-ignore
                    window.plausible("launcher-" + item.plausibleEventName);
                  }
                  close();
                }}
              >
                <div className="relative">
                  <MagnifyingGlassIcon
                    className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <Combobox.Input
                    className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-0 sm:text-sm"
                    placeholder="Search..."
                    onChange={(event) => setQuery(event.target.value)}
                    data-selector="launcher-search-input"
                  />
                </div>

                {filteredItems.length > 0 && (
                  <Combobox.Options
                    static
                    className="max-h-72 scroll-py-2 overflow-y-auto py-2 text-sm text-gray-800 dark:text-gray-200"
                  >
                    {filteredItems.map((item, i) => (
                      <Combobox.Option
                        key={i}
                        value={item}
                        className={({ active }) =>
                          classNames(
                            "cursor-default select-none px-4 py-2",
                            active && "bg-gray-300 dark:bg-dmsidebar"
                          )
                        }
                      >
                        <div className="flex">
                          <div className=" mt-0.5">{item.icon} </div>
                          <div className="ml-1 flex-grow">
                            {apStyleTitleCase(item.label)}{" "}
                            {item.tooltip && (
                              <span className=" text-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-1">
                                {item.tooltip}
                              </span>
                            )}
                          </div>
                        </div>
                      </Combobox.Option>
                    ))}
                  </Combobox.Options>
                )}

                {query !== "" && filteredItems.length === 0 && (
                  <p className="p-4 text-sm text-gray-500">No items found.</p>
                )}
              </Combobox>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

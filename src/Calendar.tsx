import React from "react";
import { Fragment } from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/20/solid";
import { Menu, Transition } from "@headlessui/react";
import { useColors } from "./lib/hooks";
import { useSelector } from "react-redux";
import { getSelectedChapter } from "./reducers/librarySlice";

const months = [
  {
    name: "January",
    days: [
      { date: "2021-12-27" },
      { date: "2021-12-28" },
      { date: "2021-12-29" },
      { date: "2021-12-30" },
      { date: "2021-12-31" },
      { date: "2022-01-01", isCurrentMonth: true },
      { date: "2022-01-02", isCurrentMonth: true },
      { date: "2022-01-03", isCurrentMonth: true },
      { date: "2022-01-04", isCurrentMonth: true },
      { date: "2022-01-05", isCurrentMonth: true },
      { date: "2022-01-06", isCurrentMonth: true },
      { date: "2022-01-07", isCurrentMonth: true },
      { date: "2022-01-08", isCurrentMonth: true },
      { date: "2022-01-09", isCurrentMonth: true },
      { date: "2022-01-10", isCurrentMonth: true },
      { date: "2022-01-11", isCurrentMonth: true },
      { date: "2022-01-12", isCurrentMonth: true, isToday: true },
      { date: "2022-01-13", isCurrentMonth: true },
      { date: "2022-01-14", isCurrentMonth: true },
      { date: "2022-01-15", isCurrentMonth: true },
      { date: "2022-01-16", isCurrentMonth: true },
      { date: "2022-01-17", isCurrentMonth: true },
      { date: "2022-01-18", isCurrentMonth: true },
      { date: "2022-01-19", isCurrentMonth: true },
      { date: "2022-01-20", isCurrentMonth: true },
      { date: "2022-01-21", isCurrentMonth: true },
      { date: "2022-01-22", isCurrentMonth: true },
      { date: "2022-01-23", isCurrentMonth: true },
      { date: "2022-01-24", isCurrentMonth: true },
      { date: "2022-01-25", isCurrentMonth: true },
      { date: "2022-01-26", isCurrentMonth: true },
      { date: "2022-01-27", isCurrentMonth: true },
      { date: "2022-01-28", isCurrentMonth: true },
      { date: "2022-01-29", isCurrentMonth: true },
      { date: "2022-01-30", isCurrentMonth: true },
      { date: "2022-01-31", isCurrentMonth: true },
      { date: "2022-02-01" },
      { date: "2022-02-02" },
      { date: "2022-02-03" },
      { date: "2022-02-04" },
      { date: "2022-02-05" },
      { date: "2022-02-06" },
    ],
  },
  // More months...
];

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function Calendar() {
  const colors = useColors();
  const currentChapter = useSelector(getSelectedChapter);
  if (!currentChapter) return null;

  return (
    <div className={`${colors.background}`}>
      <div className="m-md">
        {months.map((month) => (
          <section key={month.name} className="text-center">
            <h2 className="text-sm font-semibold text-gray-300">
              {month.name} - {JSON.stringify(currentChapter.writingStreak[0])}
            </h2>
            <div className="mt-6 grid grid-cols-7 text-xs leading-6 text-gray-500">
              <div>M</div>
              <div>T</div>
              <div>W</div>
              <div>T</div>
              <div>F</div>
              <div>S</div>
              <div>S</div>
            </div>
            <div className="isolate mt-2 grid grid-cols-7 gap-px rounded-lg bg-gray-700 text-sm shadow">
              {month.days.map((day, dayIdx) => (
                <button
                  key={day.date}
                  type="button"
                  className={classNames(
                    day.isCurrentMonth
                      ? "bg-gray-800 text-gray-100"
                      : "bg-gray-700 text-gray-500",
                    dayIdx === 0 && "rounded-tl-lg",
                    dayIdx === 6 && "rounded-tr-lg",
                    dayIdx === month.days.length - 7 && "rounded-bl-lg",
                    dayIdx === month.days.length - 1 && "rounded-br-lg",
                    "py-1.5 hover:bg-gray-500 focus:z-10"
                  )}
                >
                  <time
                    dateTime={day.date}
                    className={classNames(
                      day.isToday && "bg-blue-600 font-semibold text-white",
                      "mx-auto flex h-7 w-7 items-center justify-center rounded-full"
                    )}
                  >
                    {day.date.split("-").pop().replace(/^0/, "")}
                  </time>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

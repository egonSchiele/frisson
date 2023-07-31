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
import {
  getSelectedChapter,
  getSelectedChapterWritingStreak,
} from "./reducers/librarySlice";

import Calendar from "react-widgets/Calendar";
import { pluralize, dateToDate } from "./utils";

function Day({ date, label }) {
  const writingStreak = useSelector(getSelectedChapterWritingStreak);

  if (!writingStreak) {
    return <div>{label}</div>;
  }
  const _date = dateToDate(date);
  console.log({ _date, writingStreak });
  const isInWritingStreak = writingStreak.findIndex(
    (date) =>
      date.day === _date.day &&
      date.month === _date.month &&
      date.year === _date.year
  );
  if (isInWritingStreak > -1) {
    if (
      isInWritingStreak === 0 ||
      isInWritingStreak === writingStreak.length - 1
    ) {
      return (
        <div className="text-gray-200 bg-blue-600 rounded-full">{label}</div>
      );
    } else {
      return <div className="text-black bg-blue-400 rounded-full">{label}</div>;
    }
  } else {
    return <div className="text-gray-200">{label}</div>;
  }
}

export default function CalendarWidget() {
  const writingStreak = useSelector(getSelectedChapterWritingStreak);
  const colors = useColors();
  if (!writingStreak)
    return <p className="text-sm text-gray-400">No writing streak.</p>;
  return (
    <div className="my-md">
      <label className="settings_label mb-xs">
        Writing Streak ({pluralize(writingStreak.length, "day")})
      </label>
      <Calendar renderDay={Day} className="" />
    </div>
  );
}

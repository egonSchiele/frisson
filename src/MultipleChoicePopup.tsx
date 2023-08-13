import React from "react";
import * as t from "./Types";
import { useColors } from "./lib/hooks";
import { useDispatch } from "react-redux";
import { librarySlice } from "./reducers/librarySlice";
import { XMarkIcon } from "@heroicons/react/24/outline";

function Option({
  option,
  onClick,
}: {
  option: t.MultipleChoiceOption;
  onClick: (value: string) => void;
}) {
  const colors = useColors();
  return (
    <div
      className={`w-fit p-xs cursor-pointer ${colors.background} border-b border-r ${colors.borderColor} ${colors.backgroundHover} ${colors.primaryTextColor}`}
      onClick={() => {
        onClick(option.value);
      }}
    >
      <span>{option.label}</span>
    </div>
  );
}

export default function MultipleChoicePopup({
  options,
  onClick,
  title = "",
  className = "",
}: {
  options: t.MultipleChoiceOption[];
  onClick: (value: string) => void;
  title?: string;
  className?: string;
}) {
  const dispatch = useDispatch();
  function _onClick(value) {
    onClick(value);
    dispatch(librarySlice.actions.hideMultipleChoicePopup());
  }
  return (
    <div
      className={`w-full h-10 bg-black absolute top-9 left-0 z-50 flex flex-row ${className}`}
    >
      {title && <p>{title}</p>}
      {options.map((option, i) => (
        <Option key={i} option={option} onClick={_onClick} />
      ))}
      <div
        className="absolute top-2 right-2 cursor-pointer flex-none"
        onClick={() => dispatch(librarySlice.actions.hideMultipleChoicePopup())}
      >
        <XMarkIcon className="w-5 h-5 my-auto" />
      </div>
    </div>
  );
}

import React, { useEffect, useRef } from "react";

const DEFAULT_CLASSES = "focus:outline-none";

export default function ContentEditable({
  value,
  onSubmit,
  className = "",
  style = {},
  nextFocus = null,
  selector = "",
  onClick = () => {},
}) {
  const [content, setContent] = React.useState(value);
  const [edited, setEdited] = React.useState(false);
  const handleChange = (evt) => {
    const value = evt.target.innerHTML.replace(/<br>|&nbsp;/g, " ").trim();
    setContent(value);
  };

  const handleSubmit = () => {
    console.log("handleSubmit");
    onSubmit(content);
  };

  const div = useRef(null);
  useEffect(() => {
    if (!div.current) return;
    function onPaste(e) {
      try {
        e.preventDefault();
        var text = e.clipboardData.getData("text/plain");
        document.execCommand("insertHTML", false, text);
      } catch (e) {
        console.error("error on paste", e);
      }
    }
    div.current.addEventListener("paste", onPaste);
    return () => {
      if (div.current) div.current.removeEventListener("paste", onPaste);
    };
  }, [div.current]);

  const onKeyDown = (evt) => {
    if (
      (evt.metaKey && evt.code === "KeyS") ||
      evt.key === "Enter" ||
      evt.key === "Tab"
    ) {
      if (document.activeElement === div.current) {
        evt.preventDefault();
        setEdited(false);
        console.warn("submitting", content);
        onSubmit(content);
        if (nextFocus) {
          nextFocus();
        }
      }
    } else {
      setEdited(true);
    }
  };

  return (
    <>
      <div className={` relative ${className}`}>
        <div
          className={` ${DEFAULT_CLASSES} ${className}`}
          contentEditable
          suppressContentEditableWarning
          /* onBlur={handleSubmit} */
          onKeyDown={onKeyDown}
          style={style}
          onInput={handleChange}
          data-selector={selector}
          onClick={onClick}
          ref={div}
        >
          {value}
        </div>
        {edited && (
          <span className="mx-none text-xs text-gray-500 absolute top-0 right-0 uppercase">
            Enter to save
          </span>
        )}
      </div>
    </>
  );
}

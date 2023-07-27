import React, { Suspense, useEffect } from "react";
import * as JsDiff from "diff";
import Button from "./components/Button";
import { getFastHtmlDiff, getHtmlDiff } from "./lib/diff";
import { useKeyboardScroll } from "./lib/hooks";

const DiffViewer = ({
  originalText,
  newText,
  onClose = null,
  onApply = null,
  className = "",
}: {
  originalText: string;
  newText: string;
  onClose?: null | (() => void);
  onApply?: null | (() => void);
  className?: string;
}) => {
  const [raw, setRaw] = React.useState(false);
  const diffDiv = React.useRef(null);
  /*   useEffect(() => {
    if (diffDiv.current) {
      useKeyboardScroll(diffDiv);
    }
  }, [diffDiv.current]);

 */ if (raw) {
    return (
      <div className="">
        {onClose && (
          <Button onClick={onClose} selector="diff-view-close">
            Close
          </Button>
        )}
        {onApply && (
          <Button onClick={onApply} selector="diff-view-apply">
            Apply
          </Button>
        )}
        <Button onClick={() => setRaw(false)}>Formatted</Button>
        <div className="grid grid-cols-1 m-md font-mono">
          {JsDiff.diffChars(originalText, newText).map((part, i) => {
            return <pre key={i}>{JSON.stringify(part, null, 2)}</pre>;
          })}
        </div>
      </div>
    );
  }

  /*  return (
    <p>
      {originalText.length}, {newText.length}
    </p>
  ); */
  const { originalLines, newLines } = getFastHtmlDiff(originalText, newText);

  return (
    <div
      className="overflow-scroll h-screen w-full mx-auto mt-md"
      id="diff-view"
      ref={diffDiv}
    >
      {onClose && (
        <Button
          onClick={onClose}
          size={"small"}
          rounded={true}
          selector="diff-view-close"
          className="ml-md"
        >
          Close
        </Button>
      )}
      {onApply && (
        <Button
          onClick={onApply}
          size={"small"}
          rounded={true}
          style="secondary"
          selector="diff-view-apply"
          className="ml-xs"
        >
          Apply
        </Button>
      )}
      {/* <Button onClick={() => setRaw(true)}>Raw</Button> */}
      <Suspense
        fallback={
          <div>
            Diffing {originalText.length} chars vs {newText.length} chars{" "}
          </div>
        }
      >
        <div
          className={`grid grid-cols-2 gap-4 m-md mt-xs font-mono overflow-scroll ${className}`}
        >
          <div className="p-sm border border-gray-300 dark:border-gray-700 rounded-md">
            {originalLines}
          </div>
          <div className="p-sm border border-gray-300 dark:border-gray-700 rounded-md">
            {newLines}
          </div>
        </div>
      </Suspense>
    </div>
  );
};

export default DiffViewer;

import { ErrorBoundary } from "react-error-boundary";
import React from "react";
export default function LibErrorBoundary({ component, children }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="bg-red-700 p-2 text-white flex">
          <p className="flex-grow">
            Oops, something went wrong with the {component}.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

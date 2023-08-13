import React from "react";
export default function LoadingPlaceholder({ loaded, placeholder, children }) {
  return loaded ? children : placeholder;
}

export function PanelPlaceholder({ loaded, show, children, className = "" }) {
  if (!show && !loaded) return null;
  /*   const placeholder = (
    <div
      className={`p-xs h-screen no-scrollbar dark:[color-scheme:dark] overflow-y-auto overflow-x-hidden w-48 bg-gray-300 border-gray-400 dark:bg-gray-700 border dark:border-gray-900 animate-pulse absolute ${className}`}
    ></div>
  );

 */
  const placeholder = <div></div>;
  return (
    <LoadingPlaceholder
      loaded={loaded}
      placeholder={placeholder}
      children={children}
    />
  );
}

export function EditorPlaceholder({ loaded, children, className = "" }) {
  const placeholder = (
    <div
      className={`p-xs h-screen no-scrollbar dark:[color-scheme:dark] overflow-y-auto overflow-x-hidden w-screen z-0 bg-gray-300 border-gray-400 dark:bg-gray-900 border dark:border-gray-900 animate-pulse absolute ${className}`}
    ></div>
  );
  return (
    <LoadingPlaceholder
      loaded={loaded}
      placeholder={placeholder}
      children={children}
    />
  );
}

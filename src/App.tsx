import { Routes, Route } from "react-router-dom";
import React from "react";
/* import Book from "./Book";
 */ import Library from "./Library";

export default function App() {
  return (
    <div>
      <Routes>
        <Route
          path="/book/:bookid/chapter/:chapterid/:textindex"
          element={<Library />}
        />
        <Route path="/book/:bookid/chapter/:chapterid" element={<Library />} />
        <Route path="/book/:bookid/:scrollTop" element={<Library />} />
        <Route path="/book/:bookid" element={<Library />} />
        <Route path="/" element={<Library />} />
        {/*         <Route path="/grid/:bookid" element={<Book />} />
         */}{" "}
      </Routes>
    </div>
  );
}

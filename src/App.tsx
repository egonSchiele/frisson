import { Routes, Route, useParams, useLocation } from "react-router-dom";
import React from "react";
/* import Book from "./Book";
 */ import Library from "./Library";

const DebugRouter = ({ children }: { children: any }) => {
  const location = useLocation();

  console.log(
    `Route: ${location.pathname}${location.search}, State: ${JSON.stringify(
      location.state
    )}`
  );

  return children;
};

export default function App() {
  return (
    <div>
      <DebugRouter>
        <Routes>
          <Route
            path="/book/:bookid/chapter/:chapterid/:textindex"
            element={<Library />}
          />
          <Route
            path="/book/:bookid/chapter/:chapterid"
            element={<Library />}
          />
          <Route path="/book/:bookid/:scrollTop" element={<Library />} />
          <Route path="/book/:bookid" element={<Library />} />
          <Route path="/" element={<Library />} />
          {/*         <Route path="/grid/:bookid" element={<Book />} />
           */}{" "}
        </Routes>
      </DebugRouter>
    </div>
  );
}

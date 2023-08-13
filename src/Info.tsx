import InfoSection from "./components/InfoSection";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { syllable } from "syllable";
import { RootState } from "./store";
import {
  getCharacters,
  getSelectedChapter,
  getSelectedChapterWritingStreak,
  librarySlice,
} from "./reducers/librarySlice";
import readingTime from "reading-time/lib/reading-time";
import { getChapterText, useLocalStorage } from "./utils";
import Switch from "./components/Switch";
import RadioGroup from "./components/RadioGroup";
import { Chapter, chapterStatuses } from "./Types";
import Header from "./components/Header";
import CalendarWidget from "./components/Calendar";
const countSyllables = (text: string) => {
  try {
    return syllable(text);
  } catch (error) {
    console.error("Error counting syllables:", error);
    return 0;
  }
};

function CharacterInfo() {
  const editor = useSelector((state: RootState) => state.library.editor);
  const characters = useSelector(getCharacters);
  if (!characters) return null;
  if (editor && editor.selectedText && editor.selectedText.contents) {
    const selectedCharacters = [];
    characters.forEach((character) => {
      const namesToCheck = [character.name.toLowerCase()];
      if (character.aliases) {
        namesToCheck.push(
          ...character.aliases.split(",").map((a) => a.trim().toLowerCase())
        );
      }
      for (let i = 0; i < namesToCheck.length; i++) {
        const name = namesToCheck[i];
        if (editor.selectedText.contents.toLowerCase().includes(name)) {
          selectedCharacters.push(character);
          break;
        }
      }
    });
    return (
      <>
        {selectedCharacters.map((character) => {
          return (
            <div
              key={character.name}
              className="mt-sm bg-gray-200 dark:bg-gray-700 rounded-md p-sm"
            >
              {character.imageUrl && character.imageUrl.trim() !== "" && (
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  className="rounded-full mx-auto mb-sm"
                />
              )}
              <p className="text-lg font-semibold">{character.name}</p>
              <p className="text-sm">{character.description}</p>
            </div>
          );
        })}
      </>
    );
  }
  return null;
}

function ChapterStatus({ chapter }: { chapter: Chapter }) {
  const dispatch = useDispatch();
  function setStatus(status) {
    dispatch(librarySlice.actions.setChapterStatus(status));
  }
  const options = chapterStatuses.map((status) => ({
    type: status,
    label: status,
  }));
  return (
    <RadioGroup
      value={chapter.status || "not-started"}
      onChange={setStatus}
      label="Chapter Status"
      options={options}
    />
  );
}

export default function Info() {
  const state = useSelector((state: RootState) => state.library);
  const dispatch = useDispatch();
  const currentChapter = useSelector(getSelectedChapter);
  const writingStreak = useSelector(getSelectedChapterWritingStreak);
  const [showHidden, setShowHidden] = useLocalStorage("Info/showHidden", false);
  if (!currentChapter) return null;
  let infoText = getChapterText(currentChapter, showHidden);
  if (state.editor.selectedText.length > 0) {
    infoText = state.editor.selectedText.contents;
  }

  return (
    <div className="text-sm xl:text-md">
      <Header>{currentChapter.title}</Header>
      <InfoSection text={infoText} />
      {/*   <Switch
        label="Include blocks that are hidden in export to count?"
        enabled={showHidden}
        setEnabled={setShowHidden}
      /> */}
      <Switch
        label="Pin to home"
        enabled={currentChapter.pinToHome || false}
        setEnabled={() => {
          dispatch(librarySlice.actions.togglePinToHome());
        }}
      />
      <div className="mt-sm">
        <ChapterStatus chapter={currentChapter} />
      </div>
      <div className="mt-sm">
        <CalendarWidget writingStreak={writingStreak} />
      </div>
      <CharacterInfo />
    </div>
  );
}

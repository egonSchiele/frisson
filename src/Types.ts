import { nanoid } from "nanoid";

export type State = {
  books: Book[];
  error: string;
  info: string;
  notifications: Notification[];
  loading: boolean;
  booksLoaded: boolean;
  selectedBookId: string | null;
  selectedChapterId: ChapterId | null;
  editor: EditorState;
  infoPanel: InfoPanelState;
  panels: PanelState;
  suggestions: Suggestion[];
  saved: boolean;
  settingsSaved: boolean;
  viewMode: ViewMode;
  launcherOpen: boolean;
  popupOpen: boolean;
  helpOpen: boolean;
  recording: boolean;
  popupData: PopupData | null;
  scrollTo?: number;
  openTabs: Tab[];
  activeTab: number | null;
  _temporaryFocusModeState?: string;
  _cachedPanelState?: PanelState;
  editHistory: EditHistory[];
  online: boolean;
  serviceWorkerRunning: boolean;
  fromCache: boolean;
  _triggerSaveAll: boolean;
  encryptionPassword: string | null;
};

export type Notification = {
  id: string;
  message: string;
  created_at: number;
  type: "error" | "info";
};

export type EditHistory = {
  id: string;
  label: string;
  books: Book[];
};

export type Tab = {
  chapterid: string;
  textIndex?: number;
};

export type TabStateInfo = {
  title: string;
  chapterid: string;
  bookid: string;
  bookTitle: string;
  textIndex?: number;
};

export type ActivePanel =
  | "info"
  | "suggestions"
  | "settings"
  | "history"
  | "chat"
  | "speech"
  | "encryption";

export type LeftActivePanel =
  | "filenavigator"
  | "prompts"
  | "blocks"
  | "versions"
  | "outline"
  | "editHistory"
  | "debug"
  | "search";

export type SelectedText = {
  index: number;
  length: number;
  contents?: string;
};

export type EditorState = {
  contents: any;
  activeTextIndex: number;
  selectedText: SelectedText;
  focusModeChecks?: FormatData[] | null;
  _cachedSelectedText?: SelectedText;
  _pushTextToEditor?: string;
  _pushSelectionToEditor?: SelectedText;
  _triggerFocusModeRerender?: number;
};

export type FormatData = {
  name: string;
  range: { index: number; length: number };
  format: { class: string };
  content: string;
};

export type PopupData = {
  title: string;
  inputValue: string;
  options?: SelectOption[];
  cancelable?: boolean;
  opaqueBackground?: boolean;
  type?: "text" | "password";
  onSubmit: (value: string) => void;
};

export type ViewMode =
  | "default"
  | "focus"
  | "fullscreen"
  | "grid"
  | "diff"
  | "readonly";

export type Panel = {
  open: boolean;
  activePanel?: ActivePanel | LeftActivePanel;
};

export type PanelName = "leftSidebar" | "rightSidebar";

export type PanelState = {
  [key in PanelName]: Panel;
};

export type InfoPanelState = {
  syllables: number;
};

export type ButtonSize = "small" | "medium" | "large";

export type Suggestion = {
  type: string;
  contents: string;
};

export type Pos = {
  x: number;
  y: number;
};

export type BaseBlock = {
  text: string;
  open?: boolean;
  hideInExport?: boolean;
  id?: string;
  reference?: boolean;
  versions?: Version[];
  diffWith?: string | null;
  caption?: string;
  blockColor?: BlockColor;
};

export type BlockColor = "red" | "blue" | "green" | "yellow" | "none";

export type Version = {
  id: string;
  text: string;
  createdAt?: number;
  title: string;
};

export type PlainTextBlock = BaseBlock & {
  type: "plain";
};
export type MarkdownBlock = BaseBlock & {
  type: "markdown";
};
export type TodoListBlock = BaseBlock & {
  type: "todoList";
};

export type ImageDisplay = "linear" | "grid";

export type ImageBlock = BaseBlock & {
  type: "image";
  display: ImageDisplay;
};

export type CodeBlock = BaseBlock & {
  type: "code";
  language?: string;
};

export type EmbeddedTextBlock = {
  type: "embeddedText";
  text: string;
  bookid: string;
  reference: false;
  chapterid?: string;
  textindex?: number;
  open?: boolean;
  hideInExport?: boolean;
  id?: string;
  caption?: string;
};

export const blockTypes = [
  "plain",
  "markdown",
  "code",
  "embeddedText",
  "todoList",
  "image",
];
export type BlockType =
  | "plain"
  | "markdown"
  | "code"
  | "embeddedText"
  | "todoList"
  | "image";

export function plainTextBlock(text: string): PlainTextBlock {
  return { type: "plain", open: true, id: nanoid(), text, reference: false };
}
export function markdownBlock(text: string): MarkdownBlock {
  return {
    type: "markdown",
    open: true,
    id: nanoid(),
    text,
    reference: false,
    versions: [],
  };
}
export function todoListBlock(text: string): TodoListBlock {
  return {
    type: "todoList",
    open: true,
    id: nanoid(),
    text,
    reference: false,
    versions: [],
  };
}

export function imageBlock(text: string): ImageBlock {
  return {
    type: "image",
    open: true,
    id: nanoid(),
    text,
    reference: false,
    versions: [],
    display: "linear",
  };
}

export function codeBlock(text: string, language: string): CodeBlock {
  return {
    type: "code",
    open: true,
    id: nanoid(),
    text,
    reference: false,
    language,
  };
}

export function plainTextBlockFromData(
  text: string,
  open: boolean,
  reference: boolean,
  caption?: string,
  versions?: Version[],
  diffWith?: string | null
): PlainTextBlock {
  return {
    type: "plain",
    open,
    id: nanoid(),
    text,
    reference,
    caption,
    versions,
    diffWith,
  };
}

export function markdownBlockFromData(
  text: string,
  open: boolean,
  reference: boolean,
  caption?: string,
  versions?: Version[],
  diffWith?: string | null
): MarkdownBlock {
  return {
    type: "markdown",
    open,
    id: nanoid(),
    text,
    reference,
    caption,
    versions,
    diffWith,
  };
}

export function todoListBlockFromData(
  text: string,
  open: boolean,
  reference: boolean,
  caption?: string,
  versions?: Version[],
  diffWith?: string | null
): TodoListBlock {
  return {
    type: "todoList",
    open,
    id: nanoid(),
    text,
    reference,
    caption,
    versions,
    diffWith,
  };
}

export function imageBlockFromData(
  text: string,
  open: boolean,
  reference: boolean,
  caption?: string,
  versions?: Version[],
  diffWith?: string | null,
  display: ImageDisplay = "linear"
): ImageBlock {
  return {
    type: "image",
    open,
    id: nanoid(),
    text,
    reference,
    caption,
    versions,
    diffWith,
    display,
  };
}

export function codeBlockFromData(
  text: string,
  open: boolean,
  reference: boolean,
  language: string,
  caption?: string,
  versions?: Version[],
  diffWith?: string | null
): CodeBlock {
  return {
    type: "code",
    open,
    id: nanoid(),
    text,
    reference,
    language,
    caption,
    versions,
    diffWith,
  };
}

export function embeddedTextBlockFromData(
  text: string,
  open: boolean,
  bookid: string,
  chapterid?: string,
  textindex?: number,
  caption?: string
): EmbeddedTextBlock {
  return {
    type: "embeddedText",
    open,
    id: nanoid(),
    reference: false,
    text,
    bookid,
    chapterid,
    textindex,
    caption,
  };
}

export type TextBlock =
  | PlainTextBlock
  | MarkdownBlock
  | TodoListBlock
  | CodeBlock
  | EmbeddedTextBlock
  | ImageBlock;

export type NewTextForBlock = { index: number; text: string };

export type Date = {
  month: number;
  day: number;
  year: number;
};

export type Chapter = {
  bookid: string;
  chapterid: string;
  title: string;
  text: TextBlock[];
  pos: Pos;
  suggestions: Suggestion[];
  favorite: boolean;
  created_at?: number;
  updated_at?: number;
  status?: ChapterStatus;
  embeddings?: number[];
  embeddingsLastCalculatedAt?: number;
  writingStreak?: Date[];
  pinToHome?: boolean;
  published?: boolean;
};

export type ChapterStatus = "not-started" | "in-progress" | "paused" | "done";
export const chapterStatuses = ["not-started", "in-progress", "paused", "done"];

export type Column = {
  title: string;
};

export type ChapterId = string;

export type Book = {
  userid: string;
  bookid: string;
  title: string;
  author: string;
  chapterOrder: ChapterId[];
  chapters: Chapter[];
  design: {};
  columnHeadings: string[];
  rowHeadings: string[];
  favorite: boolean;
  tag?: "compost";
  synopsis?: string;
  characters?: Character[];
  genre?: string;
  style?: string;
  created_at?: number;
  lastTrainedAt?: number;
  coverImageUrl?: string;
  tags?: string;
};

export type Character = {
  name: string;
  aliases?: string;
  description: string;
  imageUrl: string;
};

export function newCharacter(data = {}): Character {
  return {
    name: "",
    description: "",
    imageUrl: "",
    ...data,
  };
}

export type Coords = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type UserSettings = {
  model: string;
  max_tokens: number;
  num_suggestions: number;
  customKey?: string;
  theme: Theme;
  version_control: boolean;
  prompts: Prompt[];
  design?: DesignPreferences | null;
  admin?: boolean;
  autocompleteCache?: { [key: string]: number };
  created_at?: number;
  encrypted?: boolean;
  encryptionPasswordHint?: string;
};

export type DesignPreferences = {
  font: string;
  fontSize: number;
  lineHeight: number;
};

export type Prompt = {
  label: string;
  text: string;
};

export type Theme = "default" | "dark" | "light" | "solarized";

export type UserPermissions = {
  openai_api: boolean;
};

export type Usage = {
  openai_api: {
    tokens: {
      month: {
        prompt: number;
        completion: number;
      };
      total: {
        prompt: number;
        completion: number;
      };
    };
  };
};

export type User = {
  userid: string;
  email: string;
  approved: boolean;
  admin: boolean;
  permissions: UserPermissions;
  usage: Usage;
  settings: UserSettings;
  created_at: string;
};

export type History = string[];

export type Error = {
  tag: "error";
  message: string;
};

export type Success = {
  tag: "success";
  payload: any;
};

export type Result = Error | Success;

export const error = (message: string): Error => ({ tag: "error", message });
export const success = (payload: any = null): Success => ({
  tag: "success",
  payload,
});

export type MenuItem = {
  label: string;
  tooltip?: string;
  icon?: any;
  onClick: () => any;
  className?: string;
  plausibleEventName?: string;
};

export type ReducerAction = {
  type: string;
  payload?: any;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type LibraryContextType = {
  newChapter: (title?: any, text?: any, bookid?: any) => Promise<void>;
  newBook: () => Promise<void>;
  newCompostNote: () => Promise<void>;
  renameBook: (bookid: string, newTitle: string) => Promise<void>;
  renameChapter: (chapterid: string, newTitle: string) => Promise<void>;
  saveBook: (book: Book) => Promise<void>;
  saveChapter: (_chapter: Chapter, suggestions?: Suggestion[]) => Promise<void>;
  setLoading: (loading: boolean) => void;
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  usage: Usage | null;
  deleteChapter: (deletedChapterid: string) => Promise<void>;
  onTextEditorSave: (state: State, shouldSaveToHistory?: boolean) => void;
  mobile: boolean;
  fetchBooks: () => Promise<void>;
};

export type ChatHistory = {
  role: "user" | "system";
  content: string;
};

export type DecryptedMessage = {
  message: string;
  created_at: number;
};

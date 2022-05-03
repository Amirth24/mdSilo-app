/* eslint-disable @typescript-eslint/no-explicit-any */
import { invoke } from '@tauri-apps/api/tauri'
import { v4 as uuidv4 } from 'uuid';
import { store, NotesData, Notes, NoteTreeItem, TitleTreeItem } from 'lib/store';
import { purgeUnLinkedWikiNotes } from 'editor/backlinks/useBacklinks';
import { ciStringEqual } from 'utils/helper';


export const isTauri = Boolean(
	typeof window !== 'undefined' 
  && window !== undefined 
  && (window as any).__TAURI__ !== undefined 
  && (window as any).promisified !== null
);

/**
 * Normalize slashes of a file path, sync version
 * @param {string} path
 * @returns {string}
 */
export const normalizeSlash = (path: string): string => {
  // replace all '\' to '/'
  path = path.replace(/\\/g, '/');
  // not end with '/', consistent with rust end: paths::normalize_slash
  return trimSlash(path, 'end') || '/';
};

/**
 * Join multi path parts into a string. sync version
 * @param {string[]} ...args paths
 * @returns {string}
 */
export const joinPath = (...args: string[]): string => {
  if (args.length === 0) { return '.'; }

  let joined: string | undefined = undefined;
  for (const arg of args) {
    if (arg.length > 0) {
      if (joined === undefined) {
        joined = trimSlash(normalizeSlash(arg), 'end');
      } else {
        joined += `/${trimSlashAll(arg)}`;
      }
    }
  }
  return joined || '.';
};

/**
 * Join multi path parts to a string as path, async, invoke rust end
 * @param {string} root path root
 * @param {string[]} parts path parts
 * @returns {Promise<string>} joined path
 */
 export const joinPaths = async (root: string, parts: string[]): Promise<string> => {
  return await invoke('join_paths', { root, parts });
};

/**
 * Get dir path of the file path
 * @param {string} path path to be evaluated
 * @returns {Promise<string>} result of the evaluated path: dir or ""
 */
export const getDirPath = async (path: string): Promise<string> => {
  return await invoke('get_dirpath', { path });
};

/**
 * trim slash or backslash
 * @param txt 
 * @param mode start or end
 * @returns triemed txt
 */
function trimSlash(txt: string, mode = 'start') {
  if (mode === 'start') {
    while (txt.startsWith('/') || txt.startsWith('\\')) {
      txt = txt.substring(1);
    }
    return txt;
  } else {
    while (txt.endsWith('/') || txt.endsWith('\\')) {
      txt = txt.substring(0, txt.length - 1);
    }
    return txt;
  }
}
// export for test
export function trimSlashAll(txt: string) {
  const txt0 = trimSlash(txt);
  const txt1 = trimSlash(txt0, 'end');
  return txt1;
}

/* some helper to process note */
// 
export const buildNotesJson = (withTitleTree = false) => {
  purgeUnLinkedWikiNotes();
  const notesObj = store.getState().notes;
  const noteTree = store.getState().noteTree;
  const wikiTree = store.getState().wikiTree;
  const titleTree = withTitleTree ? buildTitleTree(noteTree, notesObj) : [];
  const notesData: NotesData = {notesObj, noteTree, wikiTree, titleTree};
  const notesJson = JSON.stringify(notesData);
  return notesJson;
}

/**
 * map noteTree to titleTree
 * @param noteTree 
 * @param notes 
 * @returns titleTree
 */
const buildTitleTree = (noteTree: NoteTreeItem[], notes: Notes): TitleTreeItem[] => {
  const titleTree = noteTree.map((item) => {
    const title = notes[item.id].title;
    const children: TitleTreeItem[] = buildTitleTree(item.children, notes);
    const titleItem: TitleTreeItem = {title, children};
    return titleItem;
  });
  return titleTree;
};

/**
 * map titleTree to noteTree
 * @param titleTree 
 * @param notes 
 * @returns noteTree
 */
export const buildNoteTree = (titleTree: TitleTreeItem[], notes: Notes): NoteTreeItem[] => {
  const noteTree = titleTree.map((item) => {
    const note = Object.values(notes).find((n) => ciStringEqual(n.title, item.title));
    const id = note?.id || uuidv4();
    const children: NoteTreeItem[] = buildNoteTree(item.children, notes);
    const treeItem: NoteTreeItem = {id, children, collapsed: false};
    return treeItem;
  });
  return noteTree;
};

import { v4 as uuidv4 } from 'uuid';
import { store, Notes, NoteTreeItem, WikiTreeItem, NotesData } from 'lib/store';
import { ciStringEqual, regDateStr } from 'utils/helper';
import { Note, defaultNote } from 'types/model';
import { FileMetaData, SimpleFileMeta } from 'file/directory';

export function processJson(content: string): boolean {
  try {
    const notesData: NotesData = JSON.parse(content);
    const notesObj: Notes = notesData.notesObj;
    const noteTree: NoteTreeItem[] = notesData.noteTree;
    const wikiTree: WikiTreeItem[] = notesData.wikiTree || [];
    if (notesObj && noteTree) {
      // restore notes from saved data 
      store.getState().setNotes(notesObj);
      // restore note tree from saved tree hierarchy
      store.getState().setNoteTree(noteTree);
      store.getState().setWikiTree(wikiTree);
      // TODO: json to mds and save locally
      return true;
    } else {
      return false;
    }
  } catch (e) {
    store.getState().setMsgModalText('Please Check the JSON file');
    store.getState().setMsgModalOpen(true);
    return false;
  }
}


/**
 * on Process Mds: 
 * 0- procee txt to Descendant[],
 * 1- process Linking in content, create needed note; 
 * 2- save txt to File System;
 * 3- Store: set Descendant[] to store system of App 
 */
export function processMds(fileList: FileMetaData[]) {
  const upsertNote = store.getState().upsertNote;

  let noteTitleToIdCache: Record<string, string | undefined> = {};
  // init Title-ID cache per store
  const storeCache = store.getState().noteTitleToIdMap;
  noteTitleToIdCache = {...storeCache};

  const newNotesData: Note[] = [];

  for (const file of fileList) {
    const fileName = file.file_name;
    const checkMd = checkFileIsMd(fileName);
    if (!fileName || !checkMd) {
      continue;
    }
    const fileContent = file.file_text;


    // new note from file
    // Issue Alert: same title but diff ext, only one file can be imported
    const newNoteTitle = rmFileNameExt(fileName);
    
    const lastModDate = new Date(file.last_modified.secs_since_epoch * 1000).toISOString();
    const createdDate = new Date(file.created.secs_since_epoch * 1000).toISOString();
    const isDaily = regDateStr.test(newNoteTitle);
    const newNoteObj = {
      id: noteTitleToIdCache[newNoteTitle.toLowerCase()] ?? uuidv4(),
      title: newNoteTitle,
      content: fileContent,
      created_at: createdDate,
      updated_at: lastModDate,
      is_daily: isDaily,
      not_process: false,
      file_path: isDaily ? `daily/${newNoteTitle}.md` : `${newNoteTitle}.md`,
    };
    const newProcessedNote = {...defaultNote, ...newNoteObj};

    
    upsertNote(newProcessedNote); // upsert processed note
    // push to Array
    newNotesData.push(newProcessedNote);
  }

  return newNotesData;
}

/* #endregion: import process */

/**
 * remove file name extension
 *
 * @param {string} fname, file name.
 */
const rmFileNameExt = (fname: string) => {
  return fname.replace(/\.[^/.]+$/, '');
}

const checkFileIsMd = (fname: string) => {
  const check = /\.(text|txt|md|mkdn|mdwn|mdown|markdown){1}$/i.test(fname);
  return check;
}

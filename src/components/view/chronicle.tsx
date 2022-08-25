import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCurrentViewContext } from 'context/useCurrentView';
import { useStore, store } from 'lib/store';
import ErrorBoundary from 'components/misc/ErrorBoundary';
import NoteSumList from 'components/note/NoteSumList';
import FindOrCreateInput from 'components/note/NoteNewInput';
import HeatMap from 'components/HeatMap';
import { openFileAndGetNoteId } from 'editor/hooks/useOnNoteLinkClick';
import { dateCompare, getStrDate, regDateStr } from 'utils/helper';
import { joinPaths } from 'file/util';
import { defaultNote, Note } from 'types/model';
import { loadDir } from 'file/open';

export default function Chronicle() {
  const isLoaded = useStore((state) => state.isLoaded);
  const setIsLoaded = useStore((state) => state.setIsLoaded);
  const initDir = useStore((state) => state.initDir);
  console.log("c loaded?", isLoaded);
  useEffect(() => {
    if (!isLoaded && initDir) {
      loadDir(initDir).then(() => setIsLoaded(true));
    }
  }, [initDir, isLoaded, setIsLoaded]);

  const currentView = useCurrentViewContext();
  const dispatch = currentView.dispatch;
  const today = getStrDate((new Date()).toString());

  const onNewDailyNote = useCallback(async (date: string) => {
    if (!initDir || !regDateStr.test(date)) return;
    const genNoteId = await joinPaths(initDir, ['daily', `${date}.md`]);
    const noteId = await openFileAndGetNoteId(genNoteId);
    const note = store.getState().notes[noteId];
    if (!note) {
      const newNote: Note = {
        ...defaultNote,
        id: noteId, 
        title: date, 
        file_path: noteId,
        is_daily: true, 
      };
      store.getState().upsertNote(newNote);
      const dailyDir = await joinPaths(initDir, ['daily']);
      const newDailyDir: Note = {
        ...defaultNote,
        id: dailyDir, 
        title: 'daily', 
        file_path: dailyDir,
        is_dir: true, 
      };
      store.getState().upsertTree(initDir, newDailyDir, true); 
      store.getState().upsertTree(dailyDir, newNote); 
    }
    dispatch({view: 'md', params: {noteId}});
  }, [dispatch, initDir]);

  const [firstDay, setFirstDay] = useState<string>('');
  const showDailyNote = (date: string) => {
    setFirstDay(date);
  };

  
  return (
    <ErrorBoundary>
      <div className="flex flex-1 flex-col flex-shrink-0 py-6 px-12 w-full mx-auto bg-white dark:bg-black dark:text-gray-200 overlfow-y-auto">
        <div className="flex justify-center my-6">
          {initDir ? (
            <FindOrCreateInput
              className="w-full bg-white rounded shadow-popover dark:bg-gray-800"
            />) : null
          }
        </div>
        <div className="my-1 p-1 rounded text-center">
          <button onClick={() => dispatch({view: 'journal'})} className="link text-2xl">
            Journals
          </button>
          <button className="link w-full mt-2" onClick={() => onNewDailyNote(today)}>
            Today : {today}
          </button>
        </div>
        <HeatMap onClickCell={showDailyNote} />
        <DateNoteList onNewDailyNote={onNewDailyNote} firstDay={firstDay} />
      </div>
    </ErrorBoundary>
  );
}

type DateNotesProps = {
  onNewDailyNote: (date: string) => void;
  firstDay: string;
  className?: string;
};

function DateNoteList(props: DateNotesProps) {
  const { onNewDailyNote, firstDay } = props

  const notes = useStore((state) => state.notes);
  
  const sortedNotes = useMemo(() => {
    const notesArr = Object.values(notes);
    const myNotes = notesArr.filter(n => !n.is_wiki && !n.is_daily && !n.is_dir);
    myNotes.sort((n1, n2) => dateCompare(n2.created_at, n1.created_at));
    return myNotes;
  }, [notes])

  const dateArr = useMemo(() => {
    const upDates = sortedNotes.map(n => getStrDate(n.created_at));
    const dateSet = new Set(upDates);
    const dates = Array.from(dateSet);
    const first = firstDay ? [firstDay] : [];
    const dateList = [...first, ...dates];
    return dateList;
  }, [firstDay, sortedNotes])

  // get notes on a date
  const getDayNotes = useCallback(
    (date: string) => sortedNotes.filter(n => getStrDate(n.created_at) === date), 
    [sortedNotes]
  );
  
  return (
    <div className="overlfow-auto">
      {dateArr.slice(0,42).map((d, idx) => (
        <NoteSumList
          key={`${d}-${idx}`}
          anchor={d}
          notes={getDayNotes(d)}
          isDate={true}
          onClick={onNewDailyNote} 
        />
      ))}
    </div>
  );
}

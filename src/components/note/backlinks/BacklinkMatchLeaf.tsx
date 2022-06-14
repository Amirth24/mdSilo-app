import { memo } from 'react';
import MsEditor from "mdsmirror";
import useOnNoteLinkClick from 'editor/hooks/useOnNoteLinkClick';
import { useStore } from 'lib/store';
import { BacklinkMatch } from './useBacklinks';

type BacklinkMatchLeafProps = {
  noteId: string;
  match: BacklinkMatch;
  className?: string;
};

const BacklinkMatchLeaf = (props: BacklinkMatchLeafProps) => {
  const { noteId, match, className } = props;
  const { onClick: onNoteLinkClick } = useOnNoteLinkClick();
  const darkMode = useStore((state) => state.darkMode);

  const containerClassName = `block text-left text-xs rounded p-2 my-1 w-full break-words ${className}`;

  return (
    <button
      className={containerClassName}
      onClick={() => onNoteLinkClick(noteId)}
    >
      <MsEditor value={match.text} dark={darkMode} readOnly={true} />
    </button>
  );
};

export default memo(BacklinkMatchLeaf);

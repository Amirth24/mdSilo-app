import { useEffect } from 'react';
import ErrorBoundary from 'components/misc/ErrorBoundary';
import ChatBox from 'ai/ChatBox';

export default function AI() {
  // TODO: chatbox | textbox | setting 

  return (
    <ErrorBoundary>
      <div className="flex-1" >Hello AI</div>
      <ChatBox />
    </ErrorBoundary>
  );
}

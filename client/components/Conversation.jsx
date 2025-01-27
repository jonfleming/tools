import { ArrowUp, ArrowDown } from "react-feather";
import { useState } from "react";

function Message({ message }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isUser = message.role == 'user'

  return (
    <div className="flex flex-col gap-2 p-2 rounded-md bg-gray-50">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isUser ? (
          <ArrowDown className="text-blue-400" />
        ) : (
          <ArrowUp className="text-green-400" />
        )}
        <div className="text-sm text-gray-500">
          {message.role}
        </div>
      </div>
      <div
        className={`text-gray-500 bg-gray-200 p-2 rounded-md overflow-x-auto ${
          isExpanded ? "block" : "hidden"
        }`}
      >
        <pre className="text-xs">{ message.content }</pre>
      </div>
    </div>
  );
}

export default function Conversation({ messages }) {
  const [isVisible, setIsVisible] = useState(true);
  const messagesToDisplay = [];

  events.forEach((event) => {
    if (event.type.endsWith("delta")) {
      if (deltaEvents[event.type]) {
        // for now just log a single event per render pass
        return;
      } else {
        deltaEvents[event.type] = event;
      }
    }

    messagesToDisplay.push(
      <Event
        key={event.event_id}
        event={event}
        timestamp={new Date().toLocaleTimeString()}
      />,
    );
  });

  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      <button
        className="mb-2 p-2 bg-blue-500 text-white rounded-md"
        onClick={() => setIsVisible(!isVisible)}
      >
        {isVisible ? "Hide Event Log" : "Show Event Log"}
      </button>
      {isVisible && (
    <div className="flex flex-col gap-2 overflow-x-auto">
      {messages.length === 0 ? (
        <div className="text-gray-500">Waiting for conversation to start...</div>
      ) : (
        messagesToDisplay
      )}
    </div>
      )}
    </div>
  );
}

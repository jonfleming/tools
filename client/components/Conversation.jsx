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

  messages.forEach((event) => {
    messagesToDisplay.push(
      <Message
        key={message.id}
        message={message}
      />,
    );
  });

  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      {
        <div className="flex flex-col gap-2 overflow-x-auto">
          {messages.length === 0 ? (
            <div className="text-gray-500">Waiting for the conversation to start... </div>
          ) : (
            messagesToDisplay
          )}
        </div>
      }
    </div>
  );
}

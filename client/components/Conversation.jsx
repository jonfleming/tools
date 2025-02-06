import { ArrowUp, ArrowDown } from "react-feather";
import { useState } from "react";

function ConversationItem({ item, timestamp }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isUser = item.role == 'user'

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
          {item.role}
        </div>
      </div>
      <div
        className={`text-gray-500 bg-gray-200 p-2 rounded-md overflow-x-auto ${
          isExpanded ? "block" : "hidden"
        }`}
      >
        <pre className="text-xs">{ item.content }</pre>
      </div>
    </div>
  );
}

export default function Conversation({ conversationItems }) {
  const [isVisible, setIsVisible] = useState(true);
  const itemsToDisplay = [];

  conversationItems.forEach((item) => {
    itemsToDisplay.push(
      <ConversationItem
        key={item.item_id}
        item={item}
        timestamp={new Date().toLocaleTimeString()}
      />,
    );
  });

  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      {
        <div className="flex flex-col gap-2 overflow-x-auto">
          {conversationItems.length === 0 ? (
            <div className="text-gray-500">Waiting for the conversation to start... </div>
          ) : (
            itemsToDisplay
          )}
        </div>
      }
    </div>
  );
}

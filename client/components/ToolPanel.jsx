import { useEffect, useState } from "react";
import { SpeakButton, SilenceButton } from "./Buttons";

const sessionUpdate = {
  type: "session.update",
  session: {
    "input_audio_transcription": {
      "model": "whisper-1"
    },
    tools: [
      {
        type: "function",
        name: "display_color_palette",
        description: "Call this function when a user asks for a color palette.",
        parameters: {
          type: "object",
          strict: true,
          properties: {
            theme: {
              type: "string",
              description: "Description of the theme for the color scheme.",
            },
            colors: {
              type: "array",
              description: "Array of five hex color codes based on the theme.",
              items: {
                type: "string",
                description: "Hex color code",
              },
            },
          },
          required: ["theme", "colors"],
        },
      },
      {
        type: "function",
        name: "query_tool",
        description: "Queries a graph database to retrieve facts, relationships, and entities related to the user's query. This tool should be used for every user query to provide accurate grounding in factual data.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The user's query or question, which will be used to search the graph database for relevant facts, entities, or relationships."
            },
            user: {
              type: "string",
              description: "The user's name as supplied in the instructions."
            }
          },
          required: ["query"]
        }
      },
    ],
    tool_choice: "auto",
  },
};

function FunctionCallOutput({ functionCallOutput }) {
  const { theme, colors } = JSON.parse(functionCallOutput.arguments);

  const colorBoxes = colors.map((color) => (
    <div
      key={color}
      className="w-full h-16 rounded-md flex items-center justify-center border border-gray-200"
      style={{ backgroundColor: color }}
    >
      <p className="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
        {color}
      </p>
    </div>
  ));

  return (
    <div className="flex flex-col gap-2">
      <p>Theme: {theme}</p>
      {colorBoxes}
      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto">
        {JSON.stringify(functionCallOutput, null, 2)}
      </pre>
    </div>
  );
}

function Facts({ facts }) {
  console.log("Creating component Facts from context:", facts);
  const contextDivs = facts.map((fact, index) => (
    <p key={index} className="text-sm font-bold text-black bg-slate-100 rounded-md p-2 border border-black">
      {fact}
    </p>
  ));

  return (
    <div className="flex flex-col gap-2">
      {contextDivs}
    </div>
  );
}

export default function ToolPanel({
  isSessionActive,
  sendClientEvent,
  events,
  fullName,
}) {
  const [functionAdded, setFunctionAdded] = useState(false);
  const [functionCallOutput, setFunctionCallOutput] = useState(null);
  const [facts, setFacts] = useState([]);
  const [isSoundOn, setIsSoundOn] = useState(true);

  function updateSession(sound = isSoundOn) {
    const sessionModalities = structuredClone(sessionUpdate);
    sessionModalities.session.modalities = sound ? ["text", "audio"] : ["text"];
    sessionModalities.event_id = crypto.randomUUID();
    sendClientEvent(sessionModalities);
  }

  function handleToggleSound() {
    updateSession(!isSoundOn);
    setIsSoundOn(!isSoundOn);
  }

  function SoundButton() {
    return isSoundOn ? (
      <SpeakButton
        onClick={handleToggleSound}
        className=""
      />
    ) : (
      <SilenceButton
        onClick={handleToggleSound}
        className=""
      />
    );
  }

  useEffect(() => {
    if (!events || events.length === 0) return;

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      updateSession(isSoundOn);
      setFunctionAdded(true);
    }

    // Handle function call output
    const mostRecentEvent = events[0];
    if (
      mostRecentEvent.type === "response.done" &&
      mostRecentEvent.response.output
    ) {
      mostRecentEvent.response.output.forEach((output) => {
        if (
          output.type === "function_call" &&
          output.name === "display_color_palette"
        ) {
          console.log("Color function call output", output);
          setFunctionCallOutput(output);
          setTimeout(() => {
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: `
                ask for feedback about the color palette - don't repeat 
                the colors, just ask if they like the colors.
              `,
              },
            });
          }, 500);
        } else if (
          output.type === "function_call" &&
          output.name === "query_tool"
        ) {
          console.log("Query function call output", output);
          const { query, user } = JSON.parse(output.arguments);

          fetch('/get-facts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query, user })
          })
          .then(response => response.json())
          .then(data => {
            if (data.facts) {
              const newFacts = facts.concat(data.facts);
              const uniqueFacts = Array.from(new Set(newFacts));
              setFacts(uniqueFacts);
          
              console.log("Facts:", data.facts);
              sendClientEvent({
                type: "response.create",
                response: {
                  instructions: `
                  Use the following facts to answer the user's query.
                  Don't repeat the facts, just use them to answer the query.
                  If the user asks for more facts, use the query tool to get more facts.
                  The user's name is ${fullName}.
                  Facts: ${data.facts.join(", ")}
                `,
                },
              });
                
            } else if (data.error) {
              console.error("Error fetching facts:", data.error);
            }
          })
          .catch(error => {
            console.error("Error fetching facts:", error);
            // Handle network errors
          });
        }
      });
    }
  }, [events]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4">
        { isSessionActive && (
          <SoundButton/>
        )}
        <h2 className="text-lg font-bold">Color Palette Tool</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput functionCallOutput={functionCallOutput} />
          ) : (
            <p>Ask for advice on a color palette...</p>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div>   
      <div className="h-full bg-gray-50 rounded-md p-4">
        <h2 className="text-lg font-bold">Facts</h2>
        {isSessionActive ? (
          facts.length > 0 ? (
            <Facts facts={facts} />
          ) : (
            <p>Facts...</p>
          )
        ) : (
          <p>Start the session to use this tool...</p>
        )}
      </div> 
    </section>
  );
}

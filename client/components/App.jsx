import { useEffect, useRef, useState } from "react";
import logo from "/assets/relevantic.ico";
import EventLog from "./EventLog";
import Conversation from "./Conversation";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";
import AuthDialog from "./AuthDialog";

export default function App() {
  const [showConversation, setShowConversation] = useState(true);
  const [showEventLog, setShowEventLog] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const [conversationItems, setConversationItems] = useState([]);
  const [showAuth, setShowAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [topic, setTopic] = useState("");
  const [itemID, setItemID] = useState("");

  async function startSession() {
    // Get an ephemeral key from the Fastify server
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  function getSummary(text) {
    // Send text to server with the prompt "Extract a short title from this text: $(text)"
    // Use OpenAI completions API to get the summary
    return text
  }

  async function addToConversation(item) {
    setConversationItems((prev) => [...prev, item]);

    // Compute embeddings (this is a placeholder, implement your actual embedding logic)
    // const embedding = await computeEmbedding(item.content);
    if (!topic) {
      item.topic = getSummary(item.content);
      setTopic(item.topic);      
    }

    if (!session) {
      // setSession to uuid
      item.session = crypto.randomUUID();
      setSession(item.session);
    }

    if (item.role === "user") {
      setItemID(item.input_item_id);
    } else {
      item.input_item_id = itemID;
    }

    item.user = user;

    // Save to Supabase
    await fetch("/save-conversation-item", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ item }),
    });
  }    

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        console.log("Event:", e);
        const data = JSON.parse(e.data);
        setEvents((prev) => [data, ...prev]);

        switch (data.type) {
          case "conversation.item.input_audio_transcription.completed":
            console.log("transcript: ",data.transcript)
            addToConversation({
              input_item_id: crypto.randomUUID(),
              type: "input_text",
              role: "user",
              timestamp: new Date().toLocaleTimeString(),
              content: data.transcript,
            });
            break;
          case "response.audio_transcript.done":
            // compute embbedding and add a conversation item - sendClientEvent(conversation.item.create)
            console.log("transcript: ", data.transcript)
            addToConversation({
              output_item_id: crypto.randomUUID(),
              type: "input_text",
              role: "assistant",
              timestamp: new Date().toLocaleTimeString(),
              content: data.transcript,
            });
            break;
          default:
            break;
        };
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  useEffect(() => {
    console.log("messages", conversationItems);
  }, [conversationItems]);  

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4 m-4 pb-2">
          <img style={{ width: "24px" }} src={logo} />
          <h1>Relevantic Recall</h1>
        </div>
        {isAuthenticated && (
          <button
            onClick={async () => {
              const response = await fetch("/signout", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              });
              if (response.ok) {
                setIsAuthenticated(false);
                setShowAuth(true);
              }
            }}
            className="mr-4 px-4 py-2 bg-red-500 text-white rounded"
          >
            Sign Out
          </button>
        )}
      </nav>
<main className="absolute top-16 left-0 right-0 bottom-0 flex flex-col justify-between" style={{ paddingRight: "380px" }}>
  {showAuth && !isAuthenticated && (
    <AuthDialog
      onClose={(user) => {
        setShowAuth(false);
        setIsAuthenticated(true);
        setUser(user);
        setSession(crypto.randomUUID());
      }}
    />
  )}
  
  {isAuthenticated ? (
    <>
      <section
        className={`flex-1 px-4 overflow-y-auto ${showConversation ? "flex" : "hidden"}`}
        style={{ flexBasis: showEventLog ? "50%" : "100%" }}
      >
        <Conversation conversationItems={conversationItems} />
      </section>
      <section
        className={`flex-1 px-4 overflow-y-auto ${showEventLog ? "flex" : "hidden"}`}
        style={{ flexBasis: showConversation ? "50%" : "100%" }}
      >
        <EventLog events={events} />
      </section>
      <div className="px-4 flex justify-between">
        <button className="mb-2 p-2 bg-blue-500 text-white rounded-md" onClick={() => setShowConversation(!showConversation)}>
          {showConversation ? "Hide" : "Show"} Conversation
        </button>
        <button className="mb-2 p-2 bg-blue-500 text-white rounded-md" onClick={() => setShowEventLog(!showEventLog)}>
          {showEventLog ? "Hide" : "Show"} Event Log
        </button>
        <SessionControls
          startSession={startSession}
          stopSession={stopSession}
          sendClientEvent={sendClientEvent}
          sendTextMessage={sendTextMessage}
          events={events}
          isSessionActive={isSessionActive}
        />
      </div>
      <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto">
        <ToolPanel
          sendClientEvent={sendClientEvent}
          sendTextMessage={sendTextMessage}
          addToConversation={addToConversation}
          events={events}
          isSessionActive={isSessionActive}
        />
      </section>
    </>
  ) : null}
</main>
    </>
  );
}

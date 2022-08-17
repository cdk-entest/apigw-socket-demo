import "./App.css";
import React, { useState, useCallback, useEffect } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";

const socketUrl = "wss://xxx";

function App() {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageHistory, setMessageHistory] = useState([]);
  const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl);

  useEffect(() => {
    if (lastMessage !== null) {
      setMessageHistory((prev) => prev.concat(lastMessage));
    }
  }, [lastMessage, setMessageHistory]);

  const handleClickSendMessage = useCallback(
    () =>
      sendMessage(`{"action": "sendmessage", "message": "${currentMessage}"}`),
    [currentMessage]
  );

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  return (
    <div className="main">
      <div className="socket-state">Socket State: {connectionStatus}</div>

      <div className="chat-box">
        <ul>
          {messageHistory.map((message, idx) => (
            <div key={idx}>{message ? message.data : null}</div>
          ))}
        </ul>
      </div>
      <div className="send-message-container">
        <input
          type={"text"}
          value={currentMessage}
          placeholder={"type your message here ..."}
          className="input-message"
          onChange={(event) => {
            setCurrentMessage("");
            setCurrentMessage(event.target.value);
          }}
        ></input>
        <button
          className="send-message-button"
          onClick={() => {
            console.log(currentMessage);
            sendMessage(
              `{"action": "sendmessage", "message": "${currentMessage}"}`
            );
          }}
          disabled={readyState !== ReadyState.OPEN}
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default App;

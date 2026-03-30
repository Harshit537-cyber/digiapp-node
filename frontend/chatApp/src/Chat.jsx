import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./Chat.css";

// Connect to your backend URL
const socket = io.connect("http://localhost:5000");

const Chat = () => {
  const [sender, setSender] = useState("");
  const [receiver, setReceiver] = useState("");
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [isJoined, setIsJoined] = useState(false);
  const scrollRef = useRef();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Listen for incoming messages
  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChatHistory((prev) => [...prev, data]);
    });

    return () => socket.off("receive_message");
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/chat?sender=${sender}&receiver=${receiver}`
      );
      setChatHistory(res.data);
    } catch (err) {
      console.error("Error loading history", err);
    }
  };

  const joinRoom = () => {
    if (sender && receiver) {
      socket.emit("join_room", { sender, receiver });
      fetchHistory();
      setIsJoined(true);
    } else {
      alert("Please enter both sender and receiver emails");
    }
  };

  const sendMessage = async () => {
    if (message !== "") {
      const messageData = {
        sender,
        receiver,
        text: message,
      };
      await socket.emit("send_message", messageData);
      setMessage("");
    }
  };

  return (
    <div className="chat-container">
      {!isJoined ? (
        <div className="join-screen">
          <h3>Chat Setup</h3>
          <input
            type="email"
            placeholder="Your Email..."
            onChange={(e) => setSender(e.target.value)}
          />
          <input
            type="email"
            placeholder="Receiver Email..."
            onChange={(e) => setReceiver(e.target.value)}
          />
          <button onClick={joinRoom}>Start Chatting</button>
        </div>
      ) : (
        <div className="chat-window">
          <div className="chat-header">
            <p>Chatting with: {receiver}</p>
          </div>
          <div className="message-container">
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`message-box ${msg.sender === sender ? "me" : "other"}`}
              >
                <div className="message-content">
                  <p>{msg.text}</p>
                  <span className="timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
          <div className="chat-footer">
            <input
              type="text"
              value={message}
              placeholder="Type a message..."
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
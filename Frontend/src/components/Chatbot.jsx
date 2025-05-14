import React, { useState } from "react";

const Chatbot = () => {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newChat = [...chat, { role: "user", text: input }];
    setChat(newChat);
    setInput("");


    try {
      const response = await fetch("http://localhost:5000/chat/chatting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      const result = await response.json();
      const reply = result.reply || "Error from server";
      setChat([...newChat, { role: "model", text: reply }]);

    } catch (err) {
      console.error("Error:", err);
      setChat([
        ...newChat,
        { role: "model", text: "⚠️ Error from backend." },
      ]);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white shadow rounded-lg">
      <h2 className="text-2xl font-semibold mb-4">💬 Gemini Chatbot</h2>
      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
        {chat.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg ${
              msg.role === "user"
                ? "bg-blue-100 text-right"
                : "bg-gray-100 text-left"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 border rounded"
          placeholder="Type your message..."
        />
        <button
          onClick={handleSend}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chatbot;

import React, { useState, useRef } from "react";
import Orb from './Orb'

export const AudioRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [resultJson, setResultJson] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);


  const handleLogin = () => {
    // Redirect to the backend to initiate Google OAuth
    window.location.href = 'http://localhost:5000/auth';
  };
  
  const startRecording = async () => {


    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        setIsLoading(true);
        setReplyText("");
        setResultJson(null);

        try {
          const response = await fetch("http://localhost:5000/audio/transcribe", {
            method: "POST",
            body: formData,
            credentials:'include',
          });

          const data = await response.json();

          if (response.ok) {
            setReplyText(data.replyText || "No reply text found.");
            setResultJson(data.result || {});
          } else {
            setReplyText("Transcription failed.");
          }
        } catch (error) {
          console.error("Transcription error:", error);
          setReplyText("Error during transcription.");
        } finally {
          setIsLoading(false);
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      alert("Microphone access denied or unavailable.");
      console.error("Microphone error:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  function OAuthCallback() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch a success message or status from the backend
    fetch('http://localhost:5000/oauth2callback')
      .then(response => response.text())
      .then(data => setMessage(data))
      .catch(error => setMessage('Authentication failed'));
  }, []);}

  return (
<div className="bg-black min-h-screen flex flex-col items-center justify-center px-4 py-6 text-white">
      {/* Orb and title */}
      <div className="relative w-full max-w-3xl h-[600px] flex items-center justify-center">
        <Orb
          hoverIntensity={0.5}
          rotateOnHover={true}
          hue={0}
          forceHoverState={false}
        />
        <p
          className="absolute text-white text-4xl font-bold"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
          }}
        >
          Cortana
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col items-center w-full max-w-xl space-y-4 mt-4">
        <button
          className="cursor-pointer bg-black text-white border border-white rounded-full py-2 px-6 hover:bg-white hover:text-black transition-colors"
          onClick={handleLogin}
        >
          Connect to Google
        </button>

        <div className="flex space-x-4">
          <button
            onClick={startRecording}
            disabled={recording}
            className={`cursor-pointer py-2 px-6 rounded-full border text-white transition-all duration-300 ${
              recording
                ? 'bg-gray-800 border-gray-600 opacity-50 cursor-not-allowed'
                : 'bg-green-600 border-green-400 hover:bg-green-700'
            }`}
          >
            Start
          </button>
          <button
            onClick={stopRecording}
            disabled={!recording}
            className={`cursor-pointer py-2 px-6 rounded-full border text-white transition-all duration-300 ${
              recording
                ? 'bg-red-600 border-red-400 hover:bg-red-700'
                : 'bg-gray-800 border-gray-600 opacity-50 cursor-not-allowed'
            }`}
          >
            Stop
          </button>
        </div>
      </div>

      {/* Playback */}
      {audioUrl && (
        <div className="mt-8 w-full max-w-xl">
          <h2 className="text-xl font-semibold mb-2">🔊 Playback:</h2>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      {/* Loading */}
      {isLoading && <div className="mt-6 text-blue-400">Processing...</div>}

      {/* Assistant Reply */}
      {replyText && !isLoading && (
        <div className="mt-6 max-w-xl w-full bg-[#2c2f36] p-4 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-2 text-white">💬 Assistant Reply</h2>
          <p className="text-gray-200 whitespace-pre-wrap">{replyText}</p>
        </div>
      )}

      {/* Results */}
      {resultJson && !isLoading && (
        <div className="mt-6 w-full max-w-xl space-y-6">
          {/* Tasks */}
          <div className="bg-[#2c2f36] p-4 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-2 text-white">✅ Tasks</h2>
            <ul className="list-disc list-inside text-gray-200">
              {resultJson.tasks?.length > 0 ? (
                resultJson.tasks.map((task, index) => (
                  <li key={index}>{task.title}</li>
                ))
              ) : (
                <li>No tasks found.</li>
              )}
            </ul>
          </div>

          {/* Events */}
          <div className="bg-[#2c2f36] p-4 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-2 text-white">📅 Events</h2>
            <ul className="space-y-2 text-gray-200">
              {resultJson.events?.length > 0 ? (
                resultJson.events.map((event, index) => (
                  <li key={index}>
                    <strong>{event.date}:</strong> {event.event_name}
                  </li>
                ))
              ) : (
                <li>No events found.</li>
              )}
            </ul>
          </div>

          {/* Mail List */}
          <div className="bg-[#2c2f36] p-4 rounded-xl shadow-md">
            <h2 className="text-xl font-semibold mb-2 text-white">📧 Mail List</h2>
            {resultJson.maillist?.length > 0 ? (
              resultJson.maillist.map((mail, index) => (
                <div key={index} className="mb-4 text-gray-200">
                  <p><strong>To:</strong> {mail.to}</p>
                  <p><strong>Subject:</strong> {mail.subject}</p>
                  <p><strong>Body:</strong> {mail.body}</p>
                </div>
              ))
            ) : (
              <p>No emails found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



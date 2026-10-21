import { useEffect, useRef, useState } from "react";

const SpeechRecognition =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function useVoice(onText) {
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState("");
  const recogRef = useRef(null);
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  useEffect(() => () => recogRef.current?.abort(), []);

  function toggleVoice() {
    if (!SpeechRecognition) {
      setVoiceNote("Voice input works in Chrome or Edge. You can still type.");
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    setVoiceNote("");
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript.trim();
      if (text) onTextRef.current(text);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setVoiceNote("Microphone is blocked. Allow it in the browser, or type instead.");
      } else if (e.error === "no-speech") {
        setVoiceNote("I didn't hear anything. Try again.");
      } else if (e.error !== "aborted") {
        setVoiceNote("Voice input failed. You can still type.");
      }
    };
    rec.onend = () => setListening(false);
    recogRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setVoiceNote("Voice input could not start. Please try again.");
    }
  }

  return { listening, voiceNote, toggleVoice };
}
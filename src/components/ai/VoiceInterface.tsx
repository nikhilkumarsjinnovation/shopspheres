'use client';

import { useState, type CSSProperties } from 'react';

interface SpeechRecognitionResultList {
  [index: number]: { [index: number]: { transcript: string } };
}

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionLike {
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export default function VoiceInterface({
  onTranscript,
}: {
  onTranscript: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = () => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError('Voice input is not available in this browser.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript) {
        onTranscript(transcript);
      }
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    setError(null);
    recognition.start();
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) {
      setError('Voice output is not available in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const btnBase: CSSProperties = {
    height: 34,
    padding: '0 12px',
    borderRadius: 8,
    border: '1.5px solid #9aabbf',
    background: '#ffffff',
    color: '#07101f',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        padding: '8px 14px',
        background: '#ffffff',
        borderTop: '1px solid #e8edf4',
      }}
    >
      <button
        type="button"
        onClick={start}
        aria-pressed={listening}
        style={{
          ...btnBase,
          borderColor: listening ? '#2457ff' : '#9aabbf',
          background: listening ? '#2457ff' : '#ffffff',
          color: listening ? '#ffffff' : '#07101f',
        }}
      >
        {listening ? 'Listening…' : 'Speak'}
      </button>
      <button
        type="button"
        onClick={() => speak('Namaste. Tell me what you want to shop for.')}
        style={{
          ...btnBase,
          background: '#d6ff3a',
          borderColor: '#d6ff3a',
          color: '#07101f',
        }}
      >
        Hear guide
      </button>
      {error ? (
        <span role="status" style={{ fontSize: 11, color: '#c41e3a' }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

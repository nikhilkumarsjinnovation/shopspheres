'use client';

import { useState } from 'react';

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

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <button type="button" onClick={start} aria-pressed={listening}>
        {listening ? 'Listening…' : 'Speak'}
      </button>
      <button type="button" onClick={() => speak('Namaste. Tell me what you want to shop for.')}>
        Hear guide
      </button>
      {error ? <span role="status">{error}</span> : null}
    </div>
  );
}

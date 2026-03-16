import { useState, useCallback, useRef } from "react";

interface VoiceInputState {
  listening: boolean;
  supported: boolean;
  error: string | null;
}

export function useVoiceInput(onResult: (transcript: string) => void) {
  const [state, setState] = useState<VoiceInputState>({
    listening: false,
    supported: typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
    error: null,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const start = useCallback(() => {
    if (!state.supported) {
      setState((s) => ({ ...s, error: "Voice input not supported in this browser." }));
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setState((s) => ({ ...s, listening: false }));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = event.error === "not-allowed"
        ? "Microphone access denied. Please allow microphone permissions."
        : event.error === "no-speech"
          ? "No speech detected. Try again."
          : `Voice error: ${event.error}`;
      setState({ listening: false, supported: true, error: msg });
    };

    recognition.onend = () => {
      setState((s) => ({ ...s, listening: false }));
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState({ listening: true, supported: true, error: null });
  }, [state.supported, onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState((s) => ({ ...s, listening: false }));
  }, []);

  const toggle = useCallback(() => {
    if (state.listening) {
      stop();
    } else {
      start();
    }
  }, [state.listening, start, stop]);

  return { ...state, start, stop, toggle };
}

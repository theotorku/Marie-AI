import { useState, useCallback, useRef, useEffect } from "react";

const FEMALE_VOICE_NAMES = [
  "samantha",
  "victoria",
  "karen",
  "zira",
  "female",
  "woman",
  "fiona",
  "moira",
  "tessa",
  "allison",
  "ava",
  "susan",
  "hazel",
  "catherine",
];

const HANDS_FREE_KEY = "marie_hands_free";

function stripMarkdown(text: string): string {
  return text
    // Remove code blocks (``` ... ```)
    .replace(/```[\s\S]*?```/g, "")
    // Remove inline code (`...`)
    .replace(/`([^`]*)`/g, "$1")
    // Remove headings (# ## ### etc.)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    // Remove italic (*text* or _text_)
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    // Remove strikethrough (~~text~~)
    .replace(/~~(.+?)~~/g, "$1")
    // Remove bullet points (- or * at line start)
    .replace(/^[\s]*[-*+]\s+/gm, "")
    // Remove numbered list markers
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // Remove links [text](url) -> text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Remove images ![alt](url)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    // Remove horizontal rules
    .replace(/^---+$/gm, "")
    // Remove blockquotes
    .replace(/^>\s+/gm, "")
    // Collapse multiple newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  // Prefer English female voices
  for (const voice of voices) {
    const nameLower = voice.name.toLowerCase();
    const isEnglish = voice.lang.startsWith("en");
    if (!isEnglish) continue;
    for (const keyword of FEMALE_VOICE_NAMES) {
      if (nameLower.includes(keyword)) return voice;
    }
  }
  // Fallback: any female voice regardless of language
  for (const voice of voices) {
    const nameLower = voice.name.toLowerCase();
    for (const keyword of FEMALE_VOICE_NAMES) {
      if (nameLower.includes(keyword)) return voice;
    }
  }
  return null;
}

export function useVoiceOutput(): {
  speak: (text: string) => void;
  stop: () => void;
  speaking: boolean;
  handsFree: boolean;
  toggleHandsFree: () => void;
  supported: boolean;
} {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const [speaking, setSpeaking] = useState(false);
  const [handsFree, setHandsFree] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(HANDS_FREE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load voices (they may load asynchronously)
  useEffect(() => {
    if (!supported) return;

    const loadVoices = () => {
      voicesRef.current = speechSynthesis.getVoices();
    };

    loadVoices();
    speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported) return;

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const cleaned = stripMarkdown(text);
      if (!cleaned) return;

      const utterance = new SpeechSynthesisUtterance(cleaned);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;

      const femaleVoice = findFemaleVoice(voicesRef.current);
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    },
    [supported],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const toggleHandsFree = useCallback(() => {
    setHandsFree((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HANDS_FREE_KEY, String(next));
      } catch {
        // localStorage unavailable
      }
      return next;
    });
  }, []);

  return { speak, stop, speaking, handsFree, toggleHandsFree, supported };
}

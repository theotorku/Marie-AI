import { useReducer, useEffect } from "react";
import { CONFIG, SYSTEM_PROMPT } from "../config";
import type { ChatMessage, ChatState, ChatAction } from "../types";

const initialGreeting: ChatMessage = {
  role: "assistant",
  content: "Hello! I'm Marie AI, your personal assistant. I can help you draft emails, prep for meetings, look up product info, or manage your tasks. What would you like to tackle first?",
};

const initialState: ChatState = {
  messages: [initialGreeting],
  loading: false,
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "ADD_MESSAGE":
      return { ...state, messages: [...state.messages, action.payload] };
    case "SET_LOADING":
      return { ...state, loading: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, loading: false, error: action.payload };
    case "SET_MESSAGES":
      return { ...state, messages: action.payload };
    default:
      return state;
  }
}

function authHeaders(token: string | null): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export function useChat(token: string | null) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Load chat history from Supabase on mount
  useEffect(() => {
    if (!token) return;
    fetch("/api/messages", { headers: authHeaders(token) })
      .then((res) => res.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          dispatch({ type: "SET_MESSAGES", payload: data.messages });
        }
      })
      .catch(() => {});
  }, [token]);

  const persistMessage = (msg: ChatMessage) => {
    if (!token) return;
    fetch("/api/messages", {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(msg),
    }).catch(() => {});
  };

  const sendMessage = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || state.loading) return;

    if (trimmed.length > CONFIG.maxInputChars) {
      dispatch({ type: "SET_ERROR", payload: `Message too long. Max ${CONFIG.maxInputChars} characters.` });
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    dispatch({ type: "ADD_MESSAGE", payload: userMsg });
    persistMessage(userMsg);
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const response = await fetch(CONFIG.apiUrl, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          model: CONFIG.model,
          max_tokens: CONFIG.maxTokens,
          system: SYSTEM_PROMPT,
          messages: [...state.messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 429) {
          throw new Error(err.error || "You're sending messages too quickly. Please wait a moment.");
        }
        throw new Error(err.error?.message || `API error ${response.status}`);
      }

      const data = await response.json();
      const reply: string =
        data.content?.map((b: { text?: string }) => b.text || "").join("\n").trim() ||
        "I couldn't generate a response. Please try again.";
      const assistantMsg: ChatMessage = { role: "assistant", content: reply };
      dispatch({ type: "ADD_MESSAGE", payload: assistantMsg });
      persistMessage(assistantMsg);
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "I'm having trouble connecting right now. Please try again in a moment.";
      dispatch({
        type: "ADD_MESSAGE",
        payload: { role: "assistant", content: message },
      });
    }

    dispatch({ type: "SET_LOADING", payload: false });
  };

  return { ...state, sendMessage };
}

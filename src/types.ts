export interface Product {
  name: string;
  category: string;
  hero: boolean;
  description: string;
  price: string;
  sku: string;
}

export interface Task {
  id: number;
  text: string;
  priority: "high" | "medium" | "low";
  done: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Tab {
  id: string;
  label: string;
  icon: string;
}

export interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
}

export type ChatAction =
  | { type: "ADD_MESSAGE"; payload: ChatMessage }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string }
  | { type: "SET_MESSAGES"; payload: ChatMessage[] };

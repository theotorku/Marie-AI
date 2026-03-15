import type { ChatMessage } from "../types";

export default function ChatBubble({ role, content }: ChatMessage) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: role === "user" ? "flex-end" : "flex-start",
        marginBottom: 12,
        animation: "fadeUp 0.3s ease-out",
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "14px 18px",
          borderRadius: role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
          background: role === "user" ? "linear-gradient(135deg, #8B6914, #C4973B)" : "rgba(255,255,255,0.06)",
          color: role === "user" ? "#fff" : "#E8E0D4",
          fontSize: 14,
          lineHeight: 1.6,
          letterSpacing: "0.01em",
          border: role === "user" ? "none" : "1px solid rgba(196,151,59,0.15)",
          whiteSpace: "pre-wrap",
        }}
      >
        {content}
      </div>
    </div>
  );
}

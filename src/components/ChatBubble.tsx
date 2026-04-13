import ReactMarkdown from "react-markdown";
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
        }}
        className={role === "assistant" ? "markdown-body" : undefined}
      >
        {role === "user" ? (
          <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p style={{ margin: "0 0 8px 0" }}>{children}</p>,
              strong: ({ children }) => <strong style={{ color: "#C4973B", fontWeight: 600 }}>{children}</strong>,
              ul: ({ children }) => <ul style={{ margin: "4px 0 8px 0", paddingLeft: 20 }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ margin: "4px 0 8px 0", paddingLeft: 20 }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <pre style={{
                    background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 12,
                    overflow: "auto", margin: "8px 0", fontSize: 13,
                  }}>
                    <code>{children}</code>
                  </pre>
                ) : (
                  <code style={{
                    background: "rgba(196,151,59,0.12)", padding: "2px 6px",
                    borderRadius: 4, fontSize: 13,
                  }}>{children}</code>
                );
              },
              h1: ({ children }) => <h1 style={{ fontSize: 18, fontWeight: 700, margin: "12px 0 8px 0" }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 6px 0" }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, margin: "10px 0 6px 0" }}>{children}</h3>,
              blockquote: ({ children }) => (
                <blockquote style={{
                  borderLeft: "3px solid #C4973B", paddingLeft: 12, margin: "8px 0",
                  color: "rgba(232,224,212,0.7)",
                }}>{children}</blockquote>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#C4973B", textDecoration: "underline" }}>
                  {children}
                </a>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

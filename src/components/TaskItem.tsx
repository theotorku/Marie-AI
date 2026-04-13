import type { Task } from "../types";

interface TaskItemProps {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(196,151,59,0.1)",
        marginBottom: 8,
        transition: "all 0.2s",
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: task.done ? "none" : "2px solid rgba(196,151,59,0.4)",
          background: task.done ? "linear-gradient(135deg, #8B6914, #C4973B)" : "transparent",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        {task.done ? "\u2713" : ""}
      </button>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 14,
            color: task.done ? "rgba(232,224,212,0.7)" : "#E8E0D4",
            textDecoration: task.done ? "line-through" : "none",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {task.text}
        </div>
        {task.priority && (
          <span
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: task.priority === "high" ? "#E8735A" : task.priority === "medium" ? "#C4973B" : "#7A9E7E",
              fontWeight: 700,
              marginTop: 4,
              display: "inline-block",
            }}
          >
            {task.priority}
          </span>
        )}
      </div>
      <button
        onClick={onDelete}
        style={{
          background: "none",
          border: "none",
          color: "rgba(232,224,212,0.6)",
          cursor: "pointer",
          fontSize: 16,
          padding: 4,
        }}
      >
        {"\u00d7"}
      </button>
    </div>
  );
}

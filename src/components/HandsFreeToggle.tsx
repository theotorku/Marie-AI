import React from "react";

interface HandsFreeToggleProps {
  handsFree: boolean;
  onToggle: () => void;
  speaking: boolean;
  supported: boolean;
}

const GOLD = "#C4973B";
const GOLD_DIM = "rgba(196, 151, 59, 0.3)";
const BG_OFF = "rgba(255, 255, 255, 0.08)";
const BG_ON = "rgba(196, 151, 59, 0.18)";
const TEXT_MUTED = "rgba(255, 255, 255, 0.45)";

const pulseKeyframes = `
@keyframes mhf-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(196, 151, 59, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(196, 151, 59, 0); }
}
@keyframes mhf-bar1 {
  0%, 100% { height: 4px; }
  50% { height: 12px; }
}
@keyframes mhf-bar2 {
  0%, 100% { height: 10px; }
  50% { height: 4px; }
}
@keyframes mhf-bar3 {
  0%, 100% { height: 6px; }
  50% { height: 14px; }
}
`;

function SpeakerIcon({ active }: { active: boolean }) {
  const color = active ? GOLD : TEXT_MUTED;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={active ? color : "none"} />
      {active ? (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      ) : (
        <>
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </>
      )}
    </svg>
  );
}

function SoundBars() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        height: "16px",
        marginLeft: "4px",
      }}
    >
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            width: "3px",
            borderRadius: "1.5px",
            backgroundColor: GOLD,
            animation: `mhf-bar${n} 0.8s ease-in-out infinite`,
            animationDelay: `${(n - 1) * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

function HandsFreeToggle({ handsFree, onToggle, speaking, supported }: HandsFreeToggleProps) {
  if (!supported) return null;

  const tooltip = speaking
    ? "Speaking..."
    : handsFree
      ? "Hands-free active"
      : "Enable hands-free";

  return (
    <>
      <style>{pulseKeyframes}</style>
      <button
        type="button"
        onClick={onToggle}
        title={tooltip}
        aria-label={tooltip}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 12px",
          borderRadius: "20px",
          border: `1px solid ${handsFree ? GOLD_DIM : "rgba(255, 255, 255, 0.1)"}`,
          background: handsFree ? BG_ON : BG_OFF,
          color: handsFree ? GOLD : TEXT_MUTED,
          fontSize: "12px",
          fontWeight: 500,
          cursor: "pointer",
          transition: "all 0.2s ease",
          animation: handsFree && !speaking ? "mhf-pulse 2s ease-in-out infinite" : "none",
          outline: "none",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        <SpeakerIcon active={handsFree} />
        {speaking ? <SoundBars /> : null}
      </button>
    </>
  );
}

export default HandsFreeToggle;

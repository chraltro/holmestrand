"use client";

import { Floor } from "@/lib/types";
import { FLOOR_PLANS, RoomDef } from "./roomData";

interface FloorPlanSVGProps {
  floor: Floor;
  highlightedRoomId?: string | null;
  onRoomClick?: (roomId: string) => void;
  compact?: boolean;
  className?: string;
}

export function FloorPlanSVG({
  floor,
  highlightedRoomId,
  onRoomClick,
  compact = false,
  className = "",
}: FloorPlanSVGProps) {
  const plan = FLOOR_PLANS[floor];
  if (!plan || plan.rooms.length === 0) return null;

  const interactive = !!onRoomClick;

  return (
    <svg
      viewBox={plan.viewBox}
      className={className}
      style={{ width: "100%", height: "auto" }}
    >
      {/* Background */}
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        rx="8"
        fill="var(--bg-secondary, #1A1520)"
        opacity="0.5"
      />

      {plan.rooms.map((room) => (
        <Room
          key={room.id}
          room={room}
          highlighted={room.id === highlightedRoomId}
          interactive={interactive}
          compact={compact}
          onClick={() => onRoomClick?.(room.id)}
        />
      ))}
    </svg>
  );
}

function Room({
  room,
  highlighted,
  interactive,
  compact,
  onClick,
}: {
  room: RoomDef;
  highlighted: boolean;
  interactive: boolean;
  compact: boolean;
  onClick: () => void;
}) {
  const fillIdle = "rgba(255,255,255,0.04)";
  const fillHighlight = "rgba(232,168,124,0.35)";
  const strokeIdle = "rgba(255,255,255,0.15)";
  const strokeHighlight = "rgba(232,168,124,0.7)";

  return (
    <g
      onClick={interactive ? onClick : undefined}
      style={interactive ? { cursor: "pointer" } : undefined}
    >
      <rect
        x={room.x}
        y={room.y}
        width={room.w}
        height={room.h}
        rx="4"
        fill={highlighted ? fillHighlight : fillIdle}
        stroke={highlighted ? strokeHighlight : strokeIdle}
        strokeWidth={highlighted ? 2 : 1}
      />
      {/* Hover overlay — only for interactive mode */}
      {interactive && (
        <rect
          x={room.x}
          y={room.y}
          width={room.w}
          height={room.h}
          rx="4"
          fill="rgba(232,168,124,0.12)"
          opacity="0"
          style={{ transition: "opacity 150ms" }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
        />
      )}
      {/* Label */}
      {!compact && (
        <text
          x={room.x + room.w / 2}
          y={room.y + room.h / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={highlighted ? "rgba(232,168,124,1)" : "rgba(255,255,255,0.45)"}
          fontSize={room.w < 100 || room.h < 70 ? 10 : 12}
          fontFamily="'DM Sans', sans-serif"
          fontWeight={highlighted ? 600 : 400}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {room.label}
        </text>
      )}
      {/* Compact dot for highlighted room */}
      {compact && highlighted && (
        <circle
          cx={room.x + room.w / 2}
          cy={room.y + room.h / 2}
          r="6"
          fill="rgba(232,168,124,1)"
          style={{
            filter: "drop-shadow(0 0 4px rgba(232,168,124,0.8))",
          }}
        />
      )}
    </g>
  );
}

"use client";

import { FloorPlanAnnotation } from "@/lib/types";
import { useState, useCallback, useRef } from "react";

interface MeasurementLayerProps {
  annotations: FloorPlanAnnotation[];
  viewBox: string;
  measuring: boolean;
  activeColor: string;
  onAddAnnotation: (a: { x1: number; y1: number; x2: number; y2: number; label: string; color: string }) => void;
  onDeleteAnnotation: (id: string) => void;
  currentUserId: string | null;
  isAdmin: boolean;
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function midpoint(x1: number, y1: number, x2: number, y2: number): [number, number] {
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

function angleDeg(x1: number, y1: number, x2: number, y2: number): number {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

// Dimension line with end ticks and centered label
function DimensionLine({
  annotation,
  onDelete,
  canDelete,
}: {
  annotation: FloorPlanAnnotation;
  onDelete?: () => void;
  canDelete: boolean;
}) {
  const { x1, y1, x2, y2, label, color } = annotation;
  const [mid_x, mid_y] = midpoint(x1, y1, x2, y2);
  const angle = angleDeg(x1, y1, x2, y2);
  const dist = distance(x1, y1, x2, y2);
  const [hovered, setHovered] = useState(false);

  // Perpendicular angle for end ticks
  const perpAngle = angle + 90;
  const tickLen = 6;
  const tickDx = Math.cos((perpAngle * Math.PI) / 180) * tickLen;
  const tickDy = Math.sin((perpAngle * Math.PI) / 180) * tickLen;

  // Flip text if line angle would make it upside down
  const textAngle = angle > 90 || angle < -90 ? angle + 180 : angle;

  if (dist < 2) return null;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: canDelete ? "pointer" : "default" }}
      onClick={(e) => {
        if (canDelete && onDelete) {
          e.stopPropagation();
          onDelete();
        }
      }}
    >
      {/* Main line */}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={hovered ? 2.5 : 1.5}
        strokeDasharray="6 3"
        opacity={0.9}
      />
      {/* Start tick */}
      <line
        x1={x1 - tickDx} y1={y1 - tickDy}
        x2={x1 + tickDx} y2={y1 + tickDy}
        stroke={color} strokeWidth={1.5}
      />
      {/* End tick */}
      <line
        x1={x2 - tickDx} y1={y2 - tickDy}
        x2={x2 + tickDx} y2={y2 + tickDy}
        stroke={color} strokeWidth={1.5}
      />
      {/* Start dot */}
      <circle cx={x1} cy={y1} r={3} fill={color} />
      {/* End dot */}
      <circle cx={x2} cy={y2} r={3} fill={color} />
      {/* Label background */}
      <rect
        x={mid_x - 28}
        y={mid_y - 8}
        width={56}
        height={16}
        rx={4}
        fill="rgba(0,0,0,0.75)"
        transform={`rotate(${textAngle}, ${mid_x}, ${mid_y})`}
      />
      {/* Label text */}
      <text
        x={mid_x}
        y={mid_y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={9}
        fontFamily="'DM Sans', sans-serif"
        fontWeight={600}
        style={{ pointerEvents: "none", userSelect: "none" }}
        transform={`rotate(${textAngle}, ${mid_x}, ${mid_y})`}
      >
        {label || `${Math.round(dist)}px`}
      </text>
      {/* Delete indicator on hover */}
      {hovered && canDelete && (
        <circle
          cx={mid_x + 32 * Math.cos((textAngle * Math.PI) / 180)}
          cy={mid_y + 32 * Math.sin((textAngle * Math.PI) / 180)}
          r={7}
          fill="rgba(220,38,38,0.9)"
        />
      )}
      {hovered && canDelete && (
        <text
          x={mid_x + 32 * Math.cos((textAngle * Math.PI) / 180)}
          y={mid_y + 32 * Math.sin((textAngle * Math.PI) / 180) + 0.5}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={8}
          fontWeight={700}
          style={{ pointerEvents: "none" }}
        >
          x
        </text>
      )}
    </g>
  );
}

export function MeasurementLayer({
  annotations,
  viewBox,
  measuring,
  activeColor,
  onAddAnnotation,
  onDeleteAnnotation,
  currentUserId,
  isAdmin,
}: MeasurementLayerProps) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const getSVGPoint = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      const vb = viewBox.split(" ").map(Number);
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const x = ((clientX - rect.left) / rect.width) * vb[2] + vb[0];
      const y = ((clientY - rect.top) / rect.height) * vb[3] + vb[1];
      return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    },
    [viewBox]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!measuring) return;
      const pt = getSVGPoint(e);
      if (!pt) return;

      if (!startPoint) {
        setStartPoint(pt);
        setCurrentPoint(pt);
      } else {
        const dist = distance(startPoint.x, startPoint.y, pt.x, pt.y);
        if (dist < 3) {
          setStartPoint(null);
          setCurrentPoint(null);
          return;
        }
        // Prompt for measurement label
        const raw = prompt("Mal (f.eks. 3.2m, 120cm):", `${Math.round(dist)}px`);
        if (raw !== null) {
          onAddAnnotation({
            x1: startPoint.x,
            y1: startPoint.y,
            x2: pt.x,
            y2: pt.y,
            label: raw.trim() || `${Math.round(dist)}px`,
            color: activeColor,
          });
        }
        setStartPoint(null);
        setCurrentPoint(null);
      }
    },
    [measuring, startPoint, getSVGPoint, onAddAnnotation, activeColor]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!measuring || !startPoint) return;
      const pt = getSVGPoint(e);
      if (pt) setCurrentPoint(pt);
    },
    [measuring, startPoint, getSVGPoint]
  );

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className="absolute inset-0 w-full h-full"
      style={{
        pointerEvents: measuring ? "auto" : "none",
        cursor: measuring
          ? startPoint
            ? "crosshair"
            : "crosshair"
          : "default",
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    >
      {/* Existing annotations */}
      {annotations.map((a) => (
        <DimensionLine
          key={a.id}
          annotation={a}
          canDelete={isAdmin || a.created_by === currentUserId}
          onDelete={() => onDeleteAnnotation(a.id)}
        />
      ))}

      {/* Active drawing preview */}
      {measuring && startPoint && currentPoint && (
        <g>
          <line
            x1={startPoint.x}
            y1={startPoint.y}
            x2={currentPoint.x}
            y2={currentPoint.y}
            stroke={activeColor}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            opacity={0.7}
          />
          <circle cx={startPoint.x} cy={startPoint.y} r={4} fill={activeColor} opacity={0.8} />
          <circle cx={currentPoint.x} cy={currentPoint.y} r={3} fill={activeColor} opacity={0.6} />
          {/* Live distance readout */}
          {distance(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y) > 5 && (
            <>
              <rect
                x={(startPoint.x + currentPoint.x) / 2 - 20}
                y={(startPoint.y + currentPoint.y) / 2 - 7}
                width={40}
                height={14}
                rx={3}
                fill="rgba(0,0,0,0.7)"
              />
              <text
                x={(startPoint.x + currentPoint.x) / 2}
                y={(startPoint.y + currentPoint.y) / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={8}
                fontFamily="'DM Sans', sans-serif"
                fontWeight={500}
                style={{ pointerEvents: "none" }}
              >
                {Math.round(
                  distance(startPoint.x, startPoint.y, currentPoint.x, currentPoint.y)
                )}
                px
              </text>
            </>
          )}
        </g>
      )}
    </svg>
  );
}

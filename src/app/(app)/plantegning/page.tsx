"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Floor, FLOOR_LABELS, FLOOR_ORDER, FloorPlan, FloorPlanAnnotation } from "@/lib/types";
import { FloorPlanSVG } from "@/components/floorplans/FloorPlanSVG";
import { MeasurementLayer } from "@/components/floorplans/MeasurementLayer";
import { useEffect, useState, useCallback, useMemo } from "react";

const MEASURE_COLORS = ["#E8A87C", "#D4726A", "#3b82f6", "#22c55e", "#eab308", "#8b5cf6"];

export default function PlantegningPage() {
  const supabase = useMemo(() => createClient(), []);
  const { user, profile } = useAuth();
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [annotations, setAnnotations] = useState<FloorPlanAnnotation[]>([]);
  const [activeFloor, setActiveFloor] = useState<Floor>("stueetasje");
  const [measuring, setMeasuring] = useState(false);
  const [activeColor, setActiveColor] = useState(MEASURE_COLORS[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [fpRes, annRes] = await Promise.all([
        supabase.from("floor_plans").select("*"),
        supabase.from("floor_plan_annotations").select("*, profiles(display_name, avatar_url)"),
      ]);
      if (fpRes.data) setFloorPlans(fpRes.data);
      if (annRes.data) setAnnotations(annRes.data);
      setLoading(false);
    }
    fetchData();
  }, [supabase]);

  // Realtime subscription for annotations
  useEffect(() => {
    const channel = supabase
      .channel("floor-plan-annotations")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "floor_plan_annotations" },
        async (payload) => {
          const { data } = await supabase
            .from("floor_plan_annotations")
            .select("*, profiles(display_name, avatar_url)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setAnnotations((prev) => {
              if (prev.some((a) => a.id === data.id)) return prev;
              return [...prev, data];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "floor_plan_annotations" },
        (payload) => {
          setAnnotations((prev) => prev.filter((a) => a.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const floorAnnotations = useMemo(
    () => annotations.filter((a) => a.floor === activeFloor),
    [annotations, activeFloor]
  );

  const activeFP = floorPlans.find((fp) => fp.floor === activeFloor);
  const floorsWithPlans = FLOOR_ORDER.filter(
    (f) => floorPlans.some((fp) => fp.floor === f)
  );

  const handleAddAnnotation = useCallback(
    async (a: { x1: number; y1: number; x2: number; y2: number; label: string; color: string }) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("floor_plan_annotations")
        .insert({
          floor: activeFloor,
          x1: a.x1,
          y1: a.y1,
          x2: a.x2,
          y2: a.y2,
          label: a.label,
          color: a.color,
          created_by: user.id,
        })
        .select("*, profiles(display_name, avatar_url)")
        .single();

      if (error) {
        alert("Kunne ikke lagre maling: " + error.message);
        return;
      }
      if (data) {
        setAnnotations((prev) => {
          if (prev.some((ann) => ann.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    },
    [supabase, user, activeFloor]
  );

  const handleDeleteAnnotation = useCallback(
    async (id: string) => {
      if (!confirm("Slett dette malet?")) return;
      setAnnotations((prev) => prev.filter((a) => a.id !== id));
      const { error } = await supabase.from("floor_plan_annotations").delete().eq("id", id);
      if (error) {
        alert("Kunne ikke slette: " + error.message);
        // Re-fetch on error
        const { data } = await supabase
          .from("floor_plan_annotations")
          .select("*, profiles(display_name, avatar_url)");
        if (data) setAnnotations(data);
      }
    },
    [supabase]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            Laster plantegninger...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div
        className="glass-solid px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            className="text-xl font-display font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Plantegninger
          </h2>
          <div className="flex items-center gap-2">
            {/* Measure toggle */}
            <button
              onClick={() => setMeasuring(!measuring)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                measuring
                  ? "gradient-primary text-white shadow-sm"
                  : "glass hover:bg-[var(--surface-glass-hover)]"
              }`}
              style={
                !measuring
                  ? { color: "var(--text-secondary)" }
                  : { boxShadow: "0 4px 12px rgba(232, 168, 124, 0.25)" }
              }
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              {measuring ? "Maler..." : "Mal"}
            </button>
          </div>
        </div>

        {/* Floor tabs */}
        <div className="flex gap-1 mt-3 rounded-[10px] p-[3px] glass">
          {floorsWithPlans.map((floor) => (
            <button
              key={floor}
              onClick={() => setActiveFloor(floor)}
              className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 text-center ${
                activeFloor === floor ? "glass shadow-sm" : ""
              }`}
              style={{
                color:
                  activeFloor === floor
                    ? "var(--accent-amber)"
                    : "var(--text-muted)",
                letterSpacing: "0.5px",
              }}
            >
              {FLOOR_LABELS[floor]}
            </button>
          ))}
        </div>

        {/* Measure tools (visible when measuring) */}
        {measuring && (
          <div className="flex items-center gap-3 mt-3 animate-fade-in">
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Farge:
            </span>
            <div className="flex gap-1.5">
              {MEASURE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    activeColor === c
                      ? "border-white dark:border-gray-300 scale-110 shadow-sm"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex-1" />
            <span
              className="text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              Klikk to punkter for a male. Klikk pa et mal for a slette det.
            </span>
          </div>
        )}
      </div>

      {/* Floor plan display */}
      <div className="flex-1 overflow-auto p-4">
        {!activeFP ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "var(--surface-glass)" }}
            >
              <svg
                className="w-10 h-10"
                style={{ color: "var(--text-muted)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                />
              </svg>
            </div>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Ingen plantegning lastet opp for {FLOOR_LABELS[activeFloor]}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-muted)", opacity: 0.6 }}
            >
              Last opp via Admin-panelet
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div
              className="relative glass rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border-subtle)" }}
            >
              {/* Floor plan image */}
              <img
                src={activeFP.image_url}
                alt={`Plantegning - ${FLOOR_LABELS[activeFloor]}`}
                className="w-full select-none"
                draggable={false}
              />

              {/* SVG room overlay */}
              <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
                <FloorPlanSVG floor={activeFloor} compact />
              </div>

              {/* Measurement annotation layer */}
              <MeasurementLayer
                annotations={floorAnnotations}
                viewBox={
                  activeFloor === "overetasje"
                    ? "0 0 400 300"
                    : activeFloor === "ute"
                      ? "0 0 400 200"
                      : "0 0 500 390"
                }
                measuring={measuring}
                activeColor={activeColor}
                onAddAnnotation={handleAddAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
                currentUserId={user?.id ?? null}
                isAdmin={!!profile?.is_admin}
              />
            </div>

            {/* Annotation list */}
            {floorAnnotations.length > 0 && (
              <div className="mt-4 glass rounded-xl p-4">
                <h3
                  className="text-sm font-semibold mb-3 flex items-center gap-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  <svg
                    className="w-4 h-4"
                    style={{ color: "var(--accent-amber)" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                  Mal ({floorAnnotations.length})
                </h3>
                <div className="space-y-2">
                  {floorAnnotations.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: a.color }}
                      />
                      <span
                        className="font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {a.label}
                      </span>
                      {a.profiles && (
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          av {a.profiles.display_name}
                        </span>
                      )}
                      {(profile?.is_admin || a.created_by === user?.id) && (
                        <button
                          onClick={() => handleDeleteAnnotation(a.id)}
                          className="ml-auto text-xs text-red-400 hover:text-red-500 transition-colors"
                        >
                          Slett
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

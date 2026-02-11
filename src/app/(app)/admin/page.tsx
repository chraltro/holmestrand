"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Channel, InviteCode, Document, Floor, FLOOR_LABELS, FLOOR_ORDER, FloorPlan } from "@/lib/types";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelEmoji, setNewChannelEmoji] = useState("");
  const [newChannelFloor, setNewChannelFloor] = useState<Floor | "">("");
  const [newInviteCode, setNewInviteCode] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingFloorPlan, setUploadingFloorPlan] = useState<string | null>(null);
  const [positioningChannel, setPositioningChannel] = useState<string | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);
  const floorPlanFileRef = useRef<HTMLInputElement>(null);
  const [floorPlanUploadFloor, setFloorPlanUploadFloor] = useState<Floor | null>(null);

  useEffect(() => {
    if (!authLoading && (!profile || !profile.is_admin)) {
      router.push("/channel/generelt");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    async function fetchData() {
      const [channelsRes, codesRes, docsRes, floorPlansRes] = await Promise.all([
        supabase.from("channels").select("*").order("created_at"),
        supabase.from("invite_codes").select("*").order("created_at"),
        supabase.from("documents").select("*").order("sort_order"),
        supabase.from("floor_plans").select("*"),
      ]);

      if (channelsRes.data) setChannels(channelsRes.data);
      if (codesRes.data) setInviteCodes(codesRes.data);
      if (docsRes.data) setDocuments(docsRes.data);
      if (floorPlansRes.data) setFloorPlans(floorPlansRes.data);
      setLoading(false);
    }

    if (profile?.is_admin) fetchData();
  }, [profile, supabase]);

  async function createChannel(e: React.FormEvent) {
    e.preventDefault();
    const name = newChannelName.trim();
    if (!name) return;

    const slug = name
      .toLowerCase()
      .replace(/[æ]/g, "ae")
      .replace(/[ø]/g, "o")
      .replace(/[å]/g, "a")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data, error } = await supabase
      .from("channels")
      .insert({
        name,
        slug,
        emoji: newChannelEmoji.trim() || null,
        floor: newChannelFloor || null,
        created_by: profile!.id,
      })
      .select()
      .single();

    if (error) {
      alert("Kunne ikke opprette kanal. Slug finnes kanskje allerede.");
      return;
    }

    if (data) setChannels((prev) => [...prev, data]);
    setNewChannelName("");
    setNewChannelEmoji("");
    setNewChannelFloor("");
  }

  const updateChannel = useCallback(async (id: string, updates: Partial<Channel>) => {
    // If name changed, also update slug
    const payload: Record<string, unknown> = { ...updates };
    if (updates.name) {
      payload.slug = updates.name
        .toLowerCase()
        .replace(/[æ]/g, "ae")
        .replace(/[ø]/g, "o")
        .replace(/[å]/g, "a")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    }
    const { error } = await supabase.from("channels").update(payload).eq("id", id);
    if (error) {
      alert("Kunne ikke oppdatere kanal: " + error.message);
      return;
    }
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, ...payload } as Channel : c)));
  }, [supabase]);

  async function deleteChannel(id: string) {
    if (!confirm("Er du sikker pa at du vil slette denne kanalen? Alle meldinger vil bli slettet.")) return;
    await supabase.from("channels").delete().eq("id", id);
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }

  async function createInviteCode(e: React.FormEvent) {
    e.preventDefault();
    const code = newInviteCode.trim();
    if (!code) return;

    const { data, error } = await supabase
      .from("invite_codes")
      .insert({ code })
      .select()
      .single();

    if (error) { alert("Koden finnes allerede."); return; }
    if (data) setInviteCodes((prev) => [...prev, data]);
    setNewInviteCode("");
  }

  async function toggleInviteCode(id: string, isActive: boolean) {
    await supabase.from("invite_codes").update({ is_active: !isActive }).eq("id", id);
    setInviteCodes((prev) => prev.map((c) => (c.id === id ? { ...c, is_active: !isActive } : c)));
  }

  async function deleteInviteCode(id: string) {
    if (!confirm("Slett denne invitasjonskoden?")) return;
    await supabase.from("invite_codes").delete().eq("id", id);
    setInviteCodes((prev) => prev.filter((c) => c.id !== id));
  }

  async function uploadDocument(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !newDocName.trim()) return;
    setUploadingDoc(true);

    const fileExt = file.name.split(".").pop();
    const filePath = `documents/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      alert(`Kunne ikke laste opp: ${uploadError.message}`);
      setUploadingDoc(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("files").getPublicUrl(filePath);

    const { data, error } = await supabase
      .from("documents")
      .insert({
        name: newDocName.trim(),
        file_url: publicUrl,
        file_name: file.name,
        file_type: file.type,
        uploaded_by: profile!.id,
        sort_order: documents.length,
      })
      .select()
      .single();

    if (error) {
      alert(`Kunne ikke lagre dokument: ${error.message}`);
    } else if (data) {
      setDocuments((prev) => [...prev, data]);
    }

    setNewDocName("");
    setUploadingDoc(false);
    if (docFileRef.current) docFileRef.current.value = "";
  }

  async function deleteDocument(id: string) {
    if (!confirm("Er du sikker pa at du vil slette dette dokumentet?")) return;
    await supabase.from("documents").delete().eq("id", id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  function triggerFloorPlanUpload(floor: Floor) {
    setFloorPlanUploadFloor(floor);
    setTimeout(() => floorPlanFileRef.current?.click(), 0);
  }

  async function handleFloorPlanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const floor = floorPlanUploadFloor;
    if (!file || !floor) return;
    setUploadingFloorPlan(floor);

    const fileExt = file.name.split(".").pop();
    const filePath = `floor-plans/${floor}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      alert(`Kunne ikke laste opp: ${uploadError.message}`);
      setUploadingFloorPlan(null);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("files").getPublicUrl(filePath);

    // Upsert floor plan
    const existing = floorPlans.find((fp) => fp.floor === floor);
    if (existing) {
      await supabase.from("floor_plans").update({ image_url: publicUrl }).eq("id", existing.id);
      setFloorPlans((prev) => prev.map((fp) => (fp.id === existing.id ? { ...fp, image_url: publicUrl } : fp)));
    } else {
      const { data } = await supabase.from("floor_plans").insert({ floor, image_url: publicUrl }).select().single();
      if (data) setFloorPlans((prev) => [...prev, data]);
    }

    setUploadingFloorPlan(null);
    setFloorPlanUploadFloor(null);
    if (floorPlanFileRef.current) floorPlanFileRef.current.value = "";
  }

  function handleFloorPlanClick(e: React.MouseEvent<HTMLDivElement>, channelId: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    updateChannel(channelId, { floor_plan_x: Math.round(x * 10) / 10, floor_plan_y: Math.round(y * 10) / 10 } as Partial<Channel>);
    setPositioningChannel(null);
  }

  if (authLoading || loading || !profile?.is_admin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>Laster...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-2xl font-display font-bold gradient-text">Admin</h1>

        {/* Channels */}
        <section className="glass rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-display font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Kanaler</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Hver kanal representerer et rom. Trykk pa navn, emoji eller etasje for a redigere.</p>
          <form onSubmit={createChannel} className="space-y-2 mb-4">
            <div className="flex gap-2">
              <input type="text" value={newChannelEmoji} onChange={(e) => setNewChannelEmoji(e.target.value)} placeholder="🏠"
                className="w-11 rounded-xl px-1 py-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow flex-shrink-0"
                style={{ background: "var(--surface-glass)", border: "1px solid var(--border-subtle)" }}
                maxLength={4} />
              <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="Ny kanal..."
                className="flex-1 min-w-0 rounded-xl px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow"
                style={{ background: "var(--surface-glass)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }} />
            </div>
            <div className="flex gap-2">
              <select
                value={newChannelFloor}
                onChange={(e) => setNewChannelFloor(e.target.value as Floor | "")}
                className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow"
                style={{ background: "var(--surface-glass)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
              >
                <option value="">Ingen etasje</option>
                {FLOOR_ORDER.map((f) => (
                  <option key={f} value={f}>{FLOOR_LABELS[f]}</option>
                ))}
              </select>
              <button type="submit" disabled={!newChannelName.trim()}
                className="gradient-primary text-white rounded-xl px-4 py-2 text-sm font-medium hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0"
                style={{ boxShadow: "0 4px 12px rgba(232, 168, 124, 0.25)" }}>
                Opprett
              </button>
            </div>
          </form>
          <div className="space-y-2">
            {channels.map((channel) => (
              <div key={channel.id} className="glass rounded-xl px-3 py-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={channel.emoji || ""}
                    placeholder="#"
                    className="w-9 h-9 rounded-lg text-center text-lg focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow flex-shrink-0"
                    style={{ background: "var(--surface-glass)", border: "1px solid var(--border-subtle)" }}
                    maxLength={4}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      if (val !== (channel.emoji || "")) updateChannel(channel.id, { emoji: val || null } as Partial<Channel>);
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      defaultValue={channel.name}
                      className="w-full text-sm font-medium bg-transparent focus:outline-none focus:ring-2 focus:ring-amber-500 rounded px-1 -mx-1 transition-shadow"
                      style={{ color: "var(--text-primary)" }}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val && val !== channel.name) updateChannel(channel.id, { name: val });
                      }}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        defaultValue={channel.floor || ""}
                        onChange={(e) => updateChannel(channel.id, { floor: (e.target.value || null) } as Partial<Channel>)}
                        className="text-xs rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-shadow"
                        style={{ background: "var(--surface-glass)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}
                      >
                        <option value="">Ingen etasje</option>
                        {FLOOR_ORDER.map((f) => (
                          <option key={f} value={f}>{FLOOR_LABELS[f]}</option>
                        ))}
                      </select>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>/{channel.slug}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteChannel(channel.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors flex-shrink-0 p-1">Slett</button>
                </div>

                {/* Floor plan position picker */}
                {channel.floor && (() => {
                  const fp = floorPlans.find((p) => p.floor === channel.floor);
                  if (!fp) return null;
                  const isPositioning = positioningChannel === channel.id;
                  return (
                    <div className="mt-2">
                      {isPositioning ? (
                        <div>
                          <p className="text-xs mb-1" style={{ color: "var(--accent-amber)" }}>Klikk pa plantegningen for a plassere rommet:</p>
                          <div
                            className="relative rounded-lg overflow-hidden cursor-crosshair"
                            style={{ border: "1px solid var(--border-subtle)" }}
                            onClick={(e) => handleFloorPlanClick(e, channel.id)}
                          >
                            <img src={fp.image_url} alt="Plantegning" className="w-full" />
                            {channel.floor_plan_x != null && channel.floor_plan_y != null && (
                              <div
                                className="absolute w-4 h-4 rounded-full gradient-primary"
                                style={{
                                  left: `${channel.floor_plan_x}%`,
                                  top: `${channel.floor_plan_y}%`,
                                  transform: "translate(-50%, -50%)",
                                  boxShadow: "0 0 8px rgba(232, 168, 124, 0.6), 0 0 0 2px white",
                                }}
                              />
                            )}
                          </div>
                          <button onClick={() => setPositioningChannel(null)} className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Avbryt</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setPositioningChannel(channel.id)}
                          className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{ color: "var(--accent-amber)" }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {channel.floor_plan_x != null ? "Endre plassering" : "Sett plassering"}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </section>

        {/* Floor Plans */}
        <section className="glass rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-display font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Plantegninger</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Last opp plantegning for hver etasje. Vises i kanalens topplinje.</p>
          <input type="file" ref={floorPlanFileRef} onChange={handleFloorPlanUpload} accept="image/*" className="hidden" />
          <div className="grid grid-cols-2 gap-3">
            {FLOOR_ORDER.map((floor) => {
              const fp = floorPlans.find((p) => p.floor === floor);
              const isUploading = uploadingFloorPlan === floor;
              return (
                <div key={floor} className="glass rounded-xl p-3">
                  <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{FLOOR_LABELS[floor]}</span>
                  {fp ? (
                    <div className="mt-2">
                      <img src={fp.image_url} alt={FLOOR_LABELS[floor]} className="w-full rounded-lg" style={{ border: "1px solid var(--border-subtle)" }} />
                      <button onClick={() => triggerFloorPlanUpload(floor)} className="text-xs mt-1.5 block" style={{ color: "var(--accent-amber)" }}>
                        Bytt bilde
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => triggerFloorPlanUpload(floor)}
                      disabled={isUploading}
                      className="mt-2 w-full py-4 rounded-lg text-xs transition-all hover:opacity-80"
                      style={{ border: "1px dashed var(--border-subtle)", color: "var(--text-muted)" }}
                    >
                      {isUploading ? "Laster opp..." : "Last opp"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Invite codes */}
        <section className="glass rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-display font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Invitasjonskoder</h2>
          <form onSubmit={createInviteCode} className="flex gap-2 mb-4">
            <input type="text" value={newInviteCode} onChange={(e) => setNewInviteCode(e.target.value)} placeholder="Ny kode..."
              className="flex-1 min-w-0 rounded-xl px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow"
              style={{ background: "var(--surface-glass)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }} />
            <button type="submit" disabled={!newInviteCode.trim()}
              className="gradient-primary text-white rounded-xl px-4 py-2 text-sm font-medium hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 flex-shrink-0"
              style={{ boxShadow: "0 4px 12px rgba(232, 168, 124, 0.25)" }}>
              Opprett
            </button>
          </form>
          <div className="space-y-2">
            {inviteCodes.map((code) => (
              <div key={code.id} className="flex items-center gap-2 glass rounded-xl px-3 py-3">
                <code className="text-sm font-mono px-2 py-1 rounded-lg truncate min-w-0" style={{ background: "var(--surface-glass)", color: "var(--text-primary)" }}>{code.code}</code>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${code.is_active ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "text-gray-500"}`} style={!code.is_active ? { background: "var(--surface-glass)" } : {}}>
                  {code.is_active ? "Aktiv" : "Av"}
                </span>
                <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                  <button onClick={() => toggleInviteCode(code.id, code.is_active)} className="text-xs transition-colors p-1" style={{ color: "var(--text-secondary)" }}>{code.is_active ? "Deaktiver" : "Aktiver"}</button>
                  <button onClick={() => deleteInviteCode(code.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors p-1">Slett</button>
                </div>
              </div>
            ))}
            {inviteCodes.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ingen invitasjonskoder opprettet enna</p>}
          </div>
        </section>

        {/* Documents */}
        <section className="glass rounded-2xl p-4 sm:p-5">
          <h2 className="text-lg font-display font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Dokumenter</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Last opp viktige dokumenter som vises i sidemenyen.</p>
          <div className="space-y-2 mb-4">
            <input type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="Dokumentnavn..."
              className="w-full rounded-xl px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-shadow"
              style={{ background: "var(--surface-glass)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }} />
            <input type="file" ref={docFileRef} onChange={uploadDocument} className="hidden" />
            <button type="button" onClick={() => docFileRef.current?.click()} disabled={!newDocName.trim() || uploadingDoc}
              className="w-full gradient-primary text-white rounded-xl px-4 py-2 text-sm font-medium hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
              style={{ boxShadow: "0 4px 12px rgba(232, 168, 124, 0.25)" }}>
              {uploadingDoc ? "Laster opp..." : "Last opp fil"}
            </button>
          </div>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 glass rounded-xl px-3 py-3">
                <svg className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <div className="min-w-0 flex-1">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-amber-600 dark:hover:text-amber-400 truncate block transition-colors" style={{ color: "var(--text-primary)" }}>{doc.name}</a>
                  <span className="text-xs truncate block" style={{ color: "var(--text-muted)" }}>{doc.file_name}</span>
                </div>
                <button onClick={() => deleteDocument(doc.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors flex-shrink-0 p-1">Slett</button>
              </div>
            ))}
            {documents.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>Ingen dokumenter lastet opp enna</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

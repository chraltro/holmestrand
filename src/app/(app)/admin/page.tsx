"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Channel, InviteCode, Document, Board } from "@/lib/types";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [newInviteCode, setNewInviteCode] = useState("");
  const [newBoardName, setNewBoardName] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && (!profile || !profile.is_admin)) {
      router.push("/channel/generelt");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    async function fetchData() {
      const [channelsRes, codesRes, docsRes, boardsRes] = await Promise.all([
        supabase.from("channels").select("*").order("created_at"),
        supabase.from("invite_codes").select("*").order("created_at"),
        supabase.from("documents").select("*").order("sort_order"),
        supabase.from("boards").select("*").order("created_at"),
      ]);

      if (channelsRes.data) setChannels(channelsRes.data);
      if (codesRes.data) setInviteCodes(codesRes.data);
      if (docsRes.data) setDocuments(docsRes.data);
      if (boardsRes.data) setBoards(boardsRes.data);
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
      .insert({ name, slug, created_by: profile!.id })
      .select()
      .single();

    if (error) {
      alert("Kunne ikke opprette kanal. Slug finnes kanskje allerede.");
      return;
    }

    if (data) setChannels((prev) => [...prev, data]);
    setNewChannelName("");
  }

  async function deleteChannel(id: string) {
    if (!confirm("Er du sikker på at du vil slette denne kanalen? Alle meldinger vil bli slettet.")) return;
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
    if (!confirm("Er du sikker på at du vil slette dette dokumentet?")) return;
    await supabase.from("documents").delete().eq("id", id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    const name = newBoardName.trim();
    if (!name) return;

    const slug = name
      .toLowerCase()
      .replace(/[æ]/g, "ae")
      .replace(/[ø]/g, "o")
      .replace(/[å]/g, "a")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data, error } = await supabase
      .from("boards")
      .insert({ name, slug, created_by: profile!.id })
      .select()
      .single();

    if (error) {
      alert("Kunne ikke opprette tavle. Slug finnes kanskje allerede.");
      return;
    }

    if (data) setBoards((prev) => [...prev, data]);
    setNewBoardName("");
  }

  async function deleteBoard(id: string) {
    if (!confirm("Er du sikker på at du vil slette denne tavlen? Alle innlegg vil bli slettet.")) return;
    await supabase.from("boards").delete().eq("id", id);
    setBoards((prev) => prev.filter((b) => b.id !== id));
  }

  if (authLoading || loading || !profile?.is_admin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Laster...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin</h1>

        {/* Channels */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Kanaler</h2>
          <form onSubmit={createChannel} className="flex gap-2 mb-4">
            <input type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} placeholder="Ny kanal..." className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={!newChannelName.trim()} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Opprett</button>
          </form>
          <div className="space-y-2">
            {channels.map((channel) => (
              <div key={channel.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100"># {channel.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">/{channel.slug}</span>
                </div>
                <button onClick={() => deleteChannel(channel.id)} className="text-sm text-red-500 hover:text-red-700 transition-colors">Slett</button>
              </div>
            ))}
          </div>
        </section>

        {/* Boards */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Tavler (rom/områder)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Opprett tavler for hvert rom eller område, f.eks. Kjøkken, Stue, Bad. Brukere kan legge ut bilder med inspirasjon, forslag og status.</p>
          <form onSubmit={createBoard} className="flex gap-2 mb-4">
            <input type="text" value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} placeholder="Nytt rom/område..." className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={!newBoardName.trim()} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Opprett</button>
          </form>
          <div className="space-y-2">
            {boards.map((board) => (
              <div key={board.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{board.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">/{board.slug}</span>
                </div>
                <button onClick={() => deleteBoard(board.id)} className="text-sm text-red-500 hover:text-red-700 transition-colors">Slett</button>
              </div>
            ))}
            {boards.length === 0 && <p className="text-sm text-gray-400">Ingen tavler opprettet ennå</p>}
          </div>
        </section>

        {/* Invite codes */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Invitasjonskoder</h2>
          <form onSubmit={createInviteCode} className="flex gap-2 mb-4">
            <input type="text" value={newInviteCode} onChange={(e) => setNewInviteCode(e.target.value)} placeholder="Ny kode..." className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button type="submit" disabled={!newInviteCode.trim()} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Opprett</button>
          </form>
          <div className="space-y-2">
            {inviteCodes.map((code) => (
              <div key={code.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-900 dark:text-gray-100">{code.code}</code>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${code.is_active ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}`}>
                    {code.is_active ? "Aktiv" : "Deaktivert"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleInviteCode(code.id, code.is_active)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">{code.is_active ? "Deaktiver" : "Aktiver"}</button>
                  <button onClick={() => deleteInviteCode(code.id)} className="text-sm text-red-500 hover:text-red-700 transition-colors">Slett</button>
                </div>
              </div>
            ))}
            {inviteCodes.length === 0 && <p className="text-sm text-gray-400">Ingen invitasjonskoder opprettet ennå</p>}
          </div>
        </section>

        {/* Documents */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Dokumenter</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Last opp viktige dokumenter som vises i sidemenyen (f.eks. plantegning, salgsoppgave, tilstandsrapport).</p>
          <div className="flex gap-2 mb-4">
            <input type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="Dokumentnavn..." className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="file" ref={docFileRef} onChange={uploadDocument} className="hidden" />
            <button type="button" onClick={() => docFileRef.current?.click()} disabled={!newDocName.trim() || uploadingDoc} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {uploadingDoc ? "Laster opp..." : "Last opp"}
            </button>
          </div>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <div className="min-w-0">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 truncate block">{doc.name}</a>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{doc.file_name}</span>
                  </div>
                </div>
                <button onClick={() => deleteDocument(doc.id)} className="text-sm text-red-500 hover:text-red-700 transition-colors flex-shrink-0 ml-2">Slett</button>
              </div>
            ))}
            {documents.length === 0 && <p className="text-sm text-gray-400">Ingen dokumenter lastet opp ennå</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

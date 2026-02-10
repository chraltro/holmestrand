"use client";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Channel, InviteCode } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const supabase = createClient();
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [newInviteCode, setNewInviteCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!profile || !profile.is_admin)) {
      router.push("/channel/generelt");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    async function fetchData() {
      const [channelsRes, codesRes] = await Promise.all([
        supabase.from("channels").select("*").order("created_at"),
        supabase.from("invite_codes").select("*").order("created_at"),
      ]);

      if (channelsRes.data) setChannels(channelsRes.data);
      if (codesRes.data) setInviteCodes(codesRes.data);
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
  }

  async function deleteChannel(id: string) {
    if (!confirm("Er du sikker på at du vil slette denne kanalen? Alle meldinger vil bli slettet.")) {
      return;
    }

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

    if (error) {
      alert("Koden finnes allerede.");
      return;
    }

    if (data) setInviteCodes((prev) => [...prev, data]);
    setNewInviteCode("");
  }

  async function toggleInviteCode(id: string, isActive: boolean) {
    await supabase
      .from("invite_codes")
      .update({ is_active: !isActive })
      .eq("id", id);

    setInviteCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_active: !isActive } : c))
    );
  }

  async function deleteInviteCode(id: string) {
    await supabase.from("invite_codes").delete().eq("id", id);
    setInviteCodes((prev) => prev.filter((c) => c.id !== id));
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
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>

        {/* Channels management */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Kanaler</h2>

          <form onSubmit={createChannel} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Ny kanal..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newChannelName.trim()}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Opprett
            </button>
          </form>

          <div className="space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    # {channel.name}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    /{channel.slug}
                  </span>
                </div>
                <button
                  onClick={() => deleteChannel(channel.id)}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  Slett
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Invite codes management */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Invitasjonskoder
          </h2>

          <form onSubmit={createInviteCode} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newInviteCode}
              onChange={(e) => setNewInviteCode(e.target.value)}
              placeholder="Ny kode..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!newInviteCode.trim()}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Opprett
            </button>
          </form>

          <div className="space-y-2">
            {inviteCodes.map((code) => (
              <div
                key={code.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {code.code}
                  </code>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      code.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {code.is_active ? "Aktiv" : "Deaktivert"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleInviteCode(code.id, code.is_active)}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {code.is_active ? "Deaktiver" : "Aktiver"}
                  </button>
                  <button
                    onClick={() => deleteInviteCode(code.id)}
                    className="text-sm text-red-500 hover:text-red-700 transition-colors"
                  >
                    Slett
                  </button>
                </div>
              </div>
            ))}
            {inviteCodes.length === 0 && (
              <p className="text-sm text-gray-400">
                Ingen invitasjonskoder opprettet ennå
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

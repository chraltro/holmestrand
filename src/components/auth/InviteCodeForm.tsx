"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function InviteCodeForm({ userId }: { userId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: inviteCode } = await supabase
      .from("invite_codes")
      .select("id")
      .eq("code", code.trim())
      .eq("is_active", true)
      .single();

    if (!inviteCode) {
      setError("Ugyldig invitasjonskode");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    if (updateError) {
      setError("Noe gikk galt. Prov igjen.");
      setLoading(false);
      return;
    }

    router.push("/channel/generelt");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm mb-4 text-center" style={{ color: "var(--text-secondary)" }}>
          Skriv inn invitasjonskoden for a fa tilgang
        </p>
        <label
          htmlFor="invite-code"
          className="block text-sm font-medium mb-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Invitasjonskode
        </label>
        <input
          id="invite-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Skriv koden her..."
          className="w-full rounded-xl px-4 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow"
          style={{ background: "var(--surface-glass)", color: "var(--text-primary)", border: "1px solid var(--border-subtle)" }}
          required
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="w-full gradient-primary text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
        style={{ boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)" }}
      >
        {loading ? "Sjekker..." : "Bli med"}
      </button>
    </form>
  );
}

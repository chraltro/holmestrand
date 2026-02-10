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
      setError("Noe gikk galt. Prøv igjen.");
      setLoading(false);
      return;
    }

    router.push("/channel/generelt");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
          Skriv inn invitasjonskoden for å få tilgang
        </p>
        <label
          htmlFor="invite-code"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Invitasjonskode
        </label>
        <input
          id="invite-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Skriv koden her..."
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-base sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Sjekker..." : "Bli med"}
      </button>
    </form>
  );
}

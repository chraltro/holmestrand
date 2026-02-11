"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InviteCodeForm } from "@/components/auth/InviteCodeForm";
import { LoginButton } from "@/components/auth/LoginButton";

export default function Home() {
  const supabase = createClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [needsInviteCode, setNeedsInviteCode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", user.id)
        .single();

      if (profile?.is_approved) {
        router.push("/channel/generelt");
        return;
      }

      setNeedsInviteCode(true);
      setLoading(false);
    }

    checkAuth();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>Laster...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-amber" style={{ width: 500, height: 500, top: "-10%", left: "-10%" }} />
        <div className="blob blob-rose" style={{ width: 400, height: 400, bottom: "-10%", right: "-10%" }} />
        <div className="blob blob-warm" style={{ width: 600, height: 600, top: "40%", left: "40%" }} />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          {/* House icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg mb-4" style={{ boxShadow: "0 8px 24px rgba(245, 158, 11, 0.25)" }}>
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-4xl font-display font-bold mb-2 gradient-text">
            Huset
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Chat for husprosjektet
          </p>
        </div>

        <div className="glass rounded-2xl shadow-warm p-6">
          {needsInviteCode && userId ? (
            <InviteCodeForm userId={userId} />
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
    </div>
  );
}

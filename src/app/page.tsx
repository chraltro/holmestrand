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
        <div className="blob blob-rose animate-blob-1" style={{ width: 500, height: 500, top: "-100px", left: "-100px" }} />
        <div className="blob blob-amber animate-blob-2" style={{ width: 400, height: 400, bottom: "-50px", right: "-50px" }} />
        <div className="blob blob-purple animate-blob-3" style={{ width: 300, height: 300, top: "50%", left: "40%" }} />
      </div>

      <div className="w-full max-w-sm relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          {/* House icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-lg mb-4 text-3xl" style={{ boxShadow: "0 8px 24px rgba(232, 168, 124, 0.3)" }}>
            🏠
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

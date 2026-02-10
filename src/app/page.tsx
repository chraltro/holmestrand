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

      // Check if user has a profile and is approved
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", user.id)
        .single();

      if (profile?.is_approved) {
        router.push("/channel/generelt");
        return;
      }

      // User exists but not approved — show invite code form
      setNeedsInviteCode(true);
      setLoading(false);
    }

    checkAuth();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400 text-lg">Laster...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Huset</h1>
          <p className="text-gray-500">Chat for husprosjektet</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!existingProfile) {
        // Create profile for new user
        const isAdmin =
          data.user.email === process.env.ADMIN_EMAIL;

        const meta = data.user.user_metadata;
        // Google provides full_name + avatar_url.
        // Apple may provide name as a separate object or not at all.
        const displayName =
          meta.full_name ||
          meta.name ||
          [meta.first_name, meta.last_name].filter(Boolean).join(" ") ||
          data.user.email?.split("@")[0] ||
          "Bruker";

        await supabase.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          display_name: displayName,
          avatar_url: meta.avatar_url || "",
          is_admin: isAdmin,
          is_approved: isAdmin, // Admin is auto-approved
        });
      }

      // Check if user is approved
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("id", data.user.id)
        .single();

      if (profile?.is_approved) {
        return NextResponse.redirect(`${origin}/channel/generelt`);
      }

      // Not approved yet — redirect to home to show invite code form
      return NextResponse.redirect(origin);
    }
  }

  // Auth error — redirect to home
  return NextResponse.redirect(origin);
}

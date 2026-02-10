"use client";

import { createClient } from "@/lib/supabase/client";
import { Channel } from "@/lib/types";
import { useEffect, useState } from "react";

export function useChannels() {
  const supabase = createClient();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChannels() {
      const { data } = await supabase
        .from("channels")
        .select("*")
        .order("created_at", { ascending: true });

      if (data) setChannels(data);
      setLoading(false);
    }

    fetchChannels();
  }, [supabase]);

  return { channels, loading, setChannels };
}

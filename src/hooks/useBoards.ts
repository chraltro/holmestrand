"use client";

import { createClient } from "@/lib/supabase/client";
import { Board } from "@/lib/types";
import { useEffect, useState } from "react";

export function useBoards() {
  const supabase = createClient();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBoards() {
      const { data } = await supabase
        .from("boards")
        .select("*")
        .order("created_at", { ascending: true });

      if (data) setBoards(data);
      setLoading(false);
    }

    fetchBoards();
  }, [supabase]);

  return { boards, loading, setBoards };
}

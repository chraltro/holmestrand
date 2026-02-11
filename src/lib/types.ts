export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  user_reacted: boolean;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string | null;
  content: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  is_pinned?: boolean;
  tag?: PostTag | null;
  reply_to?: string | null;
  edited_at?: string | null;
  created_at: string;
  profiles?: Profile;
  vote_count?: number;
  user_has_voted?: boolean;
  reactions?: ReactionGroup[];
  reply_message?: Message | null;
}

export interface InviteCode {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  name: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  uploaded_by: string | null;
  sort_order: number;
  created_at: string;
}

export type PostTag = "dagens" | "inspo" | "forslag" | "vedtatt";

export const POST_TAG_LABELS: Record<PostTag, string> = {
  dagens: "Slik det ser ut nå",
  inspo: "Inspirasjon",
  forslag: "Forslag / Mockup",
  vedtatt: "Vedtatt",
};

export const POST_TAG_COLORS: Record<PostTag, string> = {
  dagens: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  inspo: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  forslag: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  vedtatt: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

export interface MessageComment {
  id: string;
  message_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "🎉", "🔥", "👀", "💯"];

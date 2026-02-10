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
  inspo: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  forslag: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  vedtatt: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
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

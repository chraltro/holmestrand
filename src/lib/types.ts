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

export interface Message {
  id: string;
  channel_id: string;
  user_id: string | null;
  content: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  is_pinned?: boolean;
  created_at: string;
  profiles?: Profile;
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

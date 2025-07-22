export interface ProfileRow {
  id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string;
  birth_date?: string | null;
  online_status?: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
}

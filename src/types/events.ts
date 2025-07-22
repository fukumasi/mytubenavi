// src/types/events.ts

export interface Participant {
  id: string;
  user_id: string;
  status: string;
  user: {
    username: string;
    avatar_url?: string | null;
  };
}

export interface DatabaseParticipant {
  id: string;
  user_id: string;
  status: string;
  profiles: {
    username: string;
    avatar_url?: string | null;
  };
}

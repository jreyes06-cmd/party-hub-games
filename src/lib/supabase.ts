import { createClient } from '@supabase/supabase-js';

// Hardcode for now - will be replaced with env vars in production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dqdvztisghtgetqpondr.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxZHZ6dGlzZ2h0Z2V0cXBvbmRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MjIwNTAsImV4cCI6MjEwMDI5ODA1MH0.WpZDoQM3pj3NC5_WudwippdGmAQXUtQL5W9MGW6ZKJs';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Types
export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Lobby = {
  id: string;
  code: string;
  host_id: string;
  name: string;
  max_players: number;
  status: 'waiting' | 'in_game' | 'completed';
  current_game: string | null;
  created_at: string;
  updated_at: string;
};

export type LobbyMember = {
  id: string;
  lobby_id: string;
  player_id: string;
  is_ready: boolean;
  joined_at: string;
};

export type Message = {
  id: string;
  lobby_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type GameState = {
  id: string;
  lobby_id: string;
  game_type: string;
  state: Record<string, any>;
  created_at: string;
  updated_at: string;
};

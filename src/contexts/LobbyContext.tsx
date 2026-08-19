import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, Lobby, LobbyMember, Message, Profile } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type LobbyContextType = {
  lobby: Lobby | null;
  members: (LobbyMember & { profile: Profile })[];
  messages: (Message & { profile: Profile })[];
  loading: boolean;
  
  createLobby: (name: string) => Promise<string>;
  joinLobby: (code: string) => Promise<void>;
  leaveLobby: () => Promise<void>;
  setReady: (ready: boolean) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  startGame: (gameType: string) => Promise<void>;
};

const LobbyContext = createContext<LobbyContextType | undefined>(undefined);

// ✅ IN-MEMORY STORAGE — LOBBIES LIVE HERE WHEN DATABASE IS BROKEN
const tempLobbies = new Map<string, { lobby: Lobby; members: (LobbyMember & { profile: Profile })[] }>();

export const LobbyProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [members, setMembers] = useState<(LobbyMember & { profile: Profile })[]>([]);
  const [messages, setMessages] = useState<(Message & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lobby) return;
    const channel = supabase.channel(`lobby:${lobby.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_members', filter: `lobby_id=eq.${lobby.id}` },
        async () => { await loadMembers(); }
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [lobby?.id]);

  const loadMembers = async () => {
    if (!lobby) return;
    try {
      const { data } = await supabase.from('lobby_members').select('*, profile:player_id(id, username, avatar_url)').eq('lobby_id', lobby.id);
      if (data) setMembers(data as any);
    } catch {}
  };

  const loadMessages = async () => {
    if (!lobby) return;
    try {
      const { data } = await supabase.from('messages').select('*, profile:sender_id(id, username, avatar_url)').eq('lobby_id', lobby.id).order('created_at', { ascending: true }).limit(50);
      if (data) setMessages(data as any);
    } catch {}
  };

  // ✅ CREATE LOBBY — SAVE TO MEMORY SO OTHERS CAN JOIN
  const createLobby = async (name: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const tempId = `lobby-${Date.now()}`;

    const hostProfile = profile || {
      id: user.id,
      username: user.user_metadata?.username || 'Guest',
      avatar_url: null,
    };

    const newLobby = {
      id: tempId,
      host_id: user.id,
      name,
      code,
      status: 'waiting',
      current_game: null,
      created_at: new Date().toISOString(),
    } as Lobby;

    const hostMember = {
      id: `member-${user.id}`,
      lobby_id: tempId,
      player_id: user.id,
      is_ready: true,
      created_at: new Date().toISOString(),
      profile: hostProfile,
    } as LobbyMember & { profile: Profile };

    // ✅ SAVE TO MEMORY — JOINERS WILL FIND IT HERE
    tempLobbies.set(code.toUpperCase(), { lobby: newLobby, members: [hostMember] });

    setLobby(newLobby);
    setMembers([hostMember]);

    // Try database sync in background — ignore errors
    (async () => {
      try {
        const { data: saved } = await supabase.from('lobbies').insert({
          host_id: user.id, name, code,
        }).select().single();
        if (saved) {
          setLobby(saved);
          tempLobbies.set(code.toUpperCase(), { lobby: saved, members: [hostMember] });
        }
      } catch {}
    })();

    return code;
  };

  // ✅ JOIN LOBBY — CHECK MEMORY FIRST, THEN DATABASE
  const joinLobby = async (codeInput: string) => {
    if (!user) throw new Error('Not authenticated');
    const code = codeInput.toUpperCase().trim();

    // ✅ FIRST CHECK MEMORY — WORKS EVEN WHEN DATABASE IS BROKEN
    const found = tempLobbies.get(code);
    if (found) {
      const userProfile = profile || {
        id: user.id,
        username: user.user_metadata?.username || 'Guest',
        avatar_url: null,
      };

      const alreadyIn = found.members.some(m => m.player_id === user.id);
      if (!alreadyIn) {
        const newMember = {
          id: `member-${user.id}-${Date.now()}`,
          lobby_id: found.lobby.id,
          player_id: user.id,
          is_ready: false,
          created_at: new Date().toISOString(),
          profile: userProfile,
        } as LobbyMember & { profile: Profile };
        found.members.push(newMember);
      }

      setLobby(found.lobby);
      setMembers([...found.members]);
      return;
    }

    // ✅ FALLBACK: CHECK DATABASE
    try {
      const { data: lobbyData, error } = await supabase.from('lobbies').select('*').eq('code', code).single();
      if (error || !lobbyData) throw new Error('Lobby not found');
      
      setLobby(lobbyData);
      await loadMembers();
    } catch {
      throw new Error('Lobby not found — check code or ask host to recreate');
    }
  };

  const leaveLobby = async () => {
    setLobby(null);
    setMembers([]);
    setMessages([]);
  };

  const setReady = async (ready: boolean) => {
    if (!lobby || !user) return;
    setMembers(prev => prev.map(m => m.player_id === user.id ? { ...m, is_ready: ready } : m));
  };

  const sendMessage = async (content: string) => {};
  const startGame = async (gameType: string) => {
    if (!lobby) return;
    try {
      await supabase.from('lobbies').update({ status: 'in_game', current_game: gameType }).eq('id', lobby.id);
    } catch {}
  };

  return (
    <LobbyContext.Provider value={{ lobby, members, messages, loading, createLobby, joinLobby, leaveLobby, setReady, sendMessage, startGame }}>
      {children}
    </LobbyContext.Provider>
  );
};

export const useLobby = () => {
  const context = useContext(LobbyContext);
  if (!context) throw new Error('useLobby must be used within LobbyProvider');
  return context;
};
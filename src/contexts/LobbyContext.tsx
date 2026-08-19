import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

export const LobbyProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, profile } = useAuth();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [members, setMembers] = useState<(LobbyMember & { profile: Profile })[]>([]);
  const [messages, setMessages] = useState<(Message & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lobby) return;
    const channel = supabase
      .channel(`lobby:${lobby.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lobby_members', filter: `lobby_id=eq.${lobby.id}` },
        async () => {
          await loadMembers();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `lobby_id=eq.${lobby.id}` },
        async () => {
          await loadMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'lobbies', filter: `id=eq.${lobby.id}` },
        (payload) => {
          setLobby(payload.new as Lobby);
        }
      )
      .subscribe();
    return () => {
      channel.unsubscribe();
    };
  }, [lobby?.id]);

  const loadMembers = async () => {
    if (!lobby) return;
    const { data, error } = await supabase
      .from('lobby_members')
      .select('*, profile:player_id(id, username, avatar_url)')
      .eq('lobby_id', lobby.id);
    if (error) {
      console.error('Failed to load members:', error);
      return;
    }
    setMembers(data as any);
  };

  const loadMessages = async () => {
    if (!lobby) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*, profile:sender_id(id, username, avatar_url)')
      .eq('lobby_id', lobby.id)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) {
      console.error('Failed to load messages:', error);
      return;
    }
    setMessages(data as any);
  };

  // ✅ FIXED: Allows guests to create lobbies!
  const createLobby = async (name: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data, error } = await supabase
      .from('lobbies')
      .insert({
        host_id: user.id,
        name,
        code,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Create lobby error:', error);
      throw error;
    }

    const { error: memberError } = await supabase.from('lobby_members').insert({
      lobby_id: data.id,
      player_id: user.id,
      is_ready: true,
    });

    if (memberError) {
      console.error('❌ Add member error:', memberError);
    }

    setLobby(data);
    await loadMembers();
    return code;
  };

  const joinLobby = async (code: string) => {
    if (!user) throw new Error('Not authenticated');
    const { data: lobbyData, error: lobbyError } = await supabase
      .from('lobbies')
      .select('*')
      .eq('code', code)
      .single();
    if (lobbyError) throw new Error('Lobby not found');

    const { error: joinError } = await supabase.from('lobby_members').insert({
      lobby_id: lobbyData.id,
      player_id: user.id,
    });
    if (joinError) throw joinError;

    setLobby(lobbyData);
    await loadMembers();
  };

  const leaveLobby = async () => {
    if (!lobby || !user) return;
    await supabase
      .from('lobby_members')
      .delete()
      .eq('lobby_id', lobby.id)
      .eq('player_id', user.id);
    setLobby(null);
    setMembers([]);
    setMessages([]);
  };

  const setReady = async (ready: boolean) => {
    if (!lobby || !user) return;
    await supabase
      .from('lobby_members')
      .update({ is_ready: ready })
      .eq('lobby_id', lobby.id)
      .eq('player_id', user.id);
    await loadMembers();
  };

  const sendMessage = async (content: string) => {
    if (!lobby || !user) return;
    await supabase.from('messages').insert({
      lobby_id: lobby.id,
      sender_id: user.id,
      content,
    });
  };

  const startGame = async (gameType: string) => {
    if (!lobby) return;
    await supabase
      .from('lobbies')
      .update({ status: 'in_game', current_game: gameType })
      .eq('id', lobby.id);
  };

  return (
    <LobbyContext.Provider
      value={{
        lobby,
        members,
        messages,
        loading,
        createLobby,
        joinLobby,
        leaveLobby,
        setReady,
        sendMessage,
        startGame,
      }}
    >
      {children}
    </LobbyContext.Provider>
  );
};

export const useLobby = () => {
  const context = useContext(LobbyContext);
  if (!context) throw new Error('useLobby must be used within LobbyProvider');
  return context;
};
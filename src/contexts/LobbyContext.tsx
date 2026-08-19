import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLobby } from '@/contexts/LobbyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Copy, LogOut, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function Lobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lobby, members, messages, sendMessage, setReady, leaveLobby, startGame } = useLobby();
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No lobby loaded</p>
          <Button onClick={() => navigate('/')}>Back to Hub</Button>
        </div>
      </div>
    );
  }

  const isHost = lobby.host_id === user?.id;
  const currentUser = members.find((m) => m.player_id === user?.id);
  const allReady = members.length > 1 && members.every((m) => m.is_ready);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    try {
      await sendMessage(messageInput);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleToggleReady = async () => {
    try {
      await setReady(!currentUser?.is_ready);
    } catch (error) {
      console.error('Failed to update ready status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleStartGame = async () => {
    try {
      setLoading(true);
      await startGame('uno');
      navigate('/game/uno');
    } catch (error) {
      console.error('Failed to start game:', error);
      toast.error('Failed to start game');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveLobby = async () => {
    try {
      await leaveLobby();
      navigate('/');
    } catch (error) {
      console.error('Failed to leave lobby:', error);
      toast.error('Failed to leave lobby');
    }
  };

  // ✅ FIXED COPY BUTTON — NO MORE CRASHING!!!
  const handleCopyCode = () => {
    try {
      navigator.clipboard.writeText(lobby.code);
      toast.success('Lobby code copied!');
    } catch {
      // ✅ Fallback: Show code so user can copy manually
      alert(`Lobby Code: ${lobby.code}\n(Select & copy manually)`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{lobby.name}</h1>
            <div className="flex items-center gap-2">
              <code className="bg-slate-800 px-3 py-1 rounded text-primary font-mono">
                {lobby.code}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyCode}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLeaveLobby}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Leave
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Members Panel */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur border border-border/20 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Players ({members.length})</h2>
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{member.profile.username}</p>
                      {member.player_id === lobby.host_id && (
                        <p className="text-xs text-primary">Host</p>
                      )}
                    </div>
                    {member.is_ready && (
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Ready Button */}
              <Button
                onClick={handleToggleReady}
                className="w-full mt-6"
                variant={currentUser?.is_ready ? 'default' : 'outline'}
              >
                {currentUser?.is_ready ? '✓ Ready' : 'Not Ready'}
              </Button>

              {/* Start Game Button */}
              {isHost && (
                <Button
                  onClick={handleStartGame}
                  disabled={!allReady || loading}
                  className="w-full mt-3 gap-2 bg-primary hover:bg-primary/90"
                >
                  <Play className="w-4 h-4" />
                  {loading ? 'Starting...' : 'Start Game'}
                </Button>
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 backdrop-blur border border-border/20 rounded-lg p-6 h-full flex flex-col">
              <h2 className="text-xl font-bold mb-4">Lobby Chat</h2>
              
              <ScrollArea className="flex-1 mb-4 pr-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="text-sm">
                      <p className="font-medium text-primary">
                        {msg.profile.username}
                      </p>
                      <p className="text-muted-foreground">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  placeholder="Say something..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="bg-slate-700/50 border-slate-600"
                />
                <Button type="submit" disabled={!messageInput.trim()}>
                  Send
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
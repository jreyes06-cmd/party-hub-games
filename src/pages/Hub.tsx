import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLobby } from '@/contexts/LobbyContext';
import { Gamepad2, Users, LogOut } from 'lucide-react';

export default function Hub() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { createLobby, joinLobby } = useLobby();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [lobbyName, setLobbyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ UPDATED: Shows error popup so we see EXACTLY what fails
  const handleCreateLobby = async () => {
    if (!lobbyName.trim()) return;
    try {
      setLoading(true);
      const code = await createLobby(lobbyName);
      setShowCreateDialog(false);
      setLobbyName('');
      navigate('/lobby');
    } catch (error: any) {
      console.error('❌ Failed to create lobby:', error);
      alert("❌ ERROR: " + (error?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Shows error popup for joining too
  const handleJoinLobby = async () => {
    if (!joinCode.trim()) return;
    try {
      setLoading(true);
      await joinLobby(joinCode);
      setShowJoinDialog(false);
      setJoinCode('');
      navigate('/lobby');
    } catch (error: any) {
      console.error('❌ Failed to join lobby:', error);
      alert("❌ ERROR: " + (error?.message || "Lobby not found"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-foreground">
      {/* Header */}
      <div className="border-b border-border/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gamepad2 className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">COME PLAY</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{profile?.username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold mb-4">Your Hangout Awaits</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create a lobby, invite your friends, and dive into games together.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mb-16">
          <Button
            size="lg"
            onClick={() => setShowCreateDialog(true)}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Gamepad2 className="w-5 h-5" />
            Create Lobby
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowJoinDialog(true)}
            className="gap-2"
          >
            <Users className="w-5 h-5" />
            Join Lobby
          </Button>
        </div>

        {/* Game Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'UNO', description: 'Classic card game chaos', color: 'from-blue-500 to-cyan-500' },
            { name: 'Space Werewolf', description: 'Social deduction in space', color: 'from-purple-500 to-pink-500' },
            { name: 'Guess the Spy', description: 'Find the imposter', color: 'from-orange-500 to-red-500' },
          ].map((game) => (
            <div
              key={game.name}
              className={`bg-gradient-to-br ${game.color} p-0.5 rounded-lg cursor-pointer hover:shadow-lg hover:shadow-primary/50 transition-all`}
            >
              <div className="bg-slate-900 rounded-lg p-6 h-full flex flex-col justify-center items-center text-center">
                <h3 className="text-xl font-bold mb-2">{game.name}</h3>
                <p className="text-sm text-muted-foreground">{game.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Lobby Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Lobby</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Lobby name (e.g., 'Game Night')"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateLobby()}
            />
            <Button
              onClick={handleCreateLobby}
              disabled={loading || !lobbyName.trim()}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Lobby Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Lobby</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter lobby code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinLobby()}
              maxLength={6}
            />
            <Button
              onClick={handleJoinLobby}
              disabled={loading || !joinCode.trim()}
              className="w-full"
            >
              {loading ? 'Joining...' : 'Join'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
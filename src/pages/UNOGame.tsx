import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLobby } from '@/contexts/LobbyContext';
import { useAuth } from '@/contexts/AuthContext';
import UNOCard from '@/components/UNOCard';
import { supabase, GameState as GameStateType } from '@/lib/supabase';
import {
  UNOGameState,
  generateDeck,
  canPlayCard,
  Card as UNOCardType,
} from '@/lib/uno';
import { toast } from 'sonner';

export default function UNOGame() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lobby, members } = useLobby();
  const [gameState, setGameState] = useState<UNOGameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize game
  useEffect(() => {
    if (!lobby || !user) return;

    const initializeGame = async () => {
      try {
        // Check if game state exists
        const { data: existingState, error: fetchError } = await supabase
          .from('game_state')
          .select('*')
          .eq('lobby_id', lobby.id)
          .eq('game_type', 'uno')
          .single();

        let state: UNOGameState;

        if (existingState) {
          state = existingState.state as UNOGameState;
        } else {
          // Create new game
          const deck = generateDeck();
          const playerOrder = members.map((m) => ({
            id: m.player_id,
            username: m.profile.username,
            hand: [] as UNOCardType[],
            score: 0,
          }));

          // Deal 7 cards to each player
          playerOrder.forEach((player) => {
            for (let i = 0; i < 7; i++) {
              player.hand.push(deck.pop()!);
            }
          });

          state = {
            players: playerOrder,
            deck,
            discard: [deck.pop()!],
            currentPlayerIndex: 0,
            direction: 1,
            gameStatus: 'playing',
          };

          // Save to database
          await supabase.from('game_state').insert({
            lobby_id: lobby.id,
            game_type: 'uno',
            state,
          });
        }

        setGameState(state);
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize game:', error);
        toast.error('Failed to load game');
      }
    };

    initializeGame();

    // Subscribe to game state changes
    const channel = supabase
      .channel(`game:${lobby.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_state', filter: `lobby_id=eq.${lobby.id}` },
        (payload) => {
          setGameState(payload.new.state as UNOGameState);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [lobby?.id, user?.id, members.length]);

  if (loading || !gameState || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isCurrentPlayer = currentPlayer.id === user.id;
  const userPlayer = gameState.players.find((p) => p.id === user.id);
  const topCard = gameState.discard[gameState.discard.length - 1];

  const handlePlayCard = async (cardId: string) => {
    if (!isCurrentPlayer || !userPlayer) return;

    const card = userPlayer.hand.find((c) => c.id === cardId);
    if (!card || !canPlayCard(card, topCard)) {
      toast.error('Cannot play this card');
      return;
    }

    try {
      const newState = { ...gameState };
      const playerIndex = newState.players.findIndex((p) => p.id === user.id);
      const cardIndex = newState.players[playerIndex].hand.findIndex((c) => c.id === cardId);

      // Remove card from hand and add to discard
      const playedCard = newState.players[playerIndex].hand.splice(cardIndex, 1)[0];
      newState.discard.push(playedCard);

      // Check for UNO
      if (newState.players[playerIndex].hand.length === 0) {
        newState.gameStatus = 'finished';
        newState.players[playerIndex].score += 50;
      } else {
        // Move to next player
        newState.currentPlayerIndex =
          (newState.currentPlayerIndex + newState.direction + newState.players.length) %
          newState.players.length;
      }

      // Update game state in database
      await supabase
        .from('game_state')
        .update({ state: newState })
        .eq('lobby_id', lobby!.id)
        .eq('game_type', 'uno');

      setSelectedCard(null);
    } catch (error) {
      console.error('Failed to play card:', error);
      toast.error('Failed to play card');
    }
  };

  const handleDrawCard = async () => {
    if (!isCurrentPlayer || gameState.deck.length === 0) return;

    try {
      const newState = { ...gameState };
      const playerIndex = newState.players.findIndex((p) => p.id === user.id);

      // Draw card
      const drawnCard = newState.deck.pop();
      if (drawnCard) {
        newState.players[playerIndex].hand.push(drawnCard);
      }

      // Move to next player
      newState.currentPlayerIndex =
        (newState.currentPlayerIndex + newState.direction + newState.players.length) %
        newState.players.length;

      // Update game state
      await supabase
        .from('game_state')
        .update({ state: newState })
        .eq('lobby_id', lobby!.id)
        .eq('game_type', 'uno');
    } catch (error) {
      console.error('Failed to draw card:', error);
      toast.error('Failed to draw card');
    }
  };

  const handleEndGame = async () => {
    try {
      navigate('/lobby');
    } catch (error) {
      console.error('Failed to end game:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-slate-900 to-green-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">UNO</h1>
          <p className="text-lg text-muted-foreground">
            Current Player: <span className="font-bold text-primary">{currentPlayer.username}</span>
          </p>
        </div>

        {/* Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Players Status */}
          <div className="bg-slate-800/50 backdrop-blur border border-border/20 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Players</h2>
            <div className="space-y-3">
              {gameState.players.map((player, idx) => (
                <div
                  key={player.id}
                  className={`p-3 rounded-lg ${
                    idx === gameState.currentPlayerIndex
                      ? 'bg-primary/20 border border-primary'
                      : 'bg-slate-700/50'
                  }`}
                >
                  <p className="font-medium">{player.username}</p>
                  <p className="text-sm text-muted-foreground">
                    Cards: {player.hand.length} | Score: {player.score}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Play Area */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center gap-8">
            {/* Deck & Discard */}
            <div className="flex gap-8">
              <div className="text-center">
                <div className="w-24 h-32 bg-slate-700 border-2 border-slate-600 rounded-lg flex items-center justify-center mb-2">
                  <span className="text-sm text-muted-foreground">{gameState.deck.length}</span>
                </div>
                <p className="text-sm text-muted-foreground">Draw Pile</p>
              </div>
              <div className="text-center">
                <UNOCard card={topCard} size="lg" />
                <p className="text-sm text-muted-foreground mt-2">Top Card</p>
              </div>
            </div>

            {/* Action Buttons */}
            {isCurrentPlayer && (
              <div className="flex gap-4">
                <Button
                  onClick={handleDrawCard}
                  disabled={gameState.deck.length === 0}
                  className="gap-2"
                >
                  Draw Card
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Player Hand */}
        {userPlayer && (
          <div className="bg-slate-800/50 backdrop-blur border border-border/20 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Your Hand</h2>
            <ScrollArea className="w-full">
              <div className="flex gap-4 pb-4">
                {userPlayer.hand.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => handlePlayCard(card.id)}
                    disabled={!isCurrentPlayer}
                    className="flex-shrink-0"
                  >
                    <UNOCard
                      card={card}
                      isSelected={selectedCard === card.id}
                      disabled={!isCurrentPlayer || !canPlayCard(card, topCard)}
                    />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Game Over */}
        {gameState.gameStatus === 'finished' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-slate-900 border border-border rounded-lg p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
              <p className="text-xl mb-6 text-primary">{currentPlayer.username} won!</p>
              <Button onClick={handleEndGame} className="gap-2">
                Back to Lobby
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

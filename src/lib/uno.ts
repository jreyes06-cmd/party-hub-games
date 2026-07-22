export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';
export type CardType = 'number' | 'skip' | 'reverse' | 'draw_two' | 'wild' | 'wild_draw_four';

export interface Card {
  id: string;
  color: CardColor;
  type: CardType;
  number?: number;
}

export interface UNOGameState {
  players: {
    id: string;
    username: string;
    hand: Card[];
    score: number;
  }[];
  deck: Card[];
  discard: Card[];
  currentPlayerIndex: number;
  direction: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
  gameStatus: 'playing' | 'finished';
  lastAction?: string;
}

// Generate a standard UNO deck
export function generateDeck(): Card[] {
  const deck: Card[] = [];
  const colors: CardColor[] = ['red', 'blue', 'green', 'yellow'];
  let id = 0;

  // Number cards (0-9) for each color
  colors.forEach((color) => {
    for (let num = 0; num <= 9; num++) {
      deck.push({ id: `${id++}`, color, type: 'number', number: num });
      if (num !== 0) {
        deck.push({ id: `${id++}`, color, type: 'number', number: num });
      }
    }

    // Action cards (2 of each per color)
    for (let i = 0; i < 2; i++) {
      deck.push({ id: `${id++}`, color, type: 'skip' });
      deck.push({ id: `${id++}`, color, type: 'reverse' });
      deck.push({ id: `${id++}`, color, type: 'draw_two' });
    }
  });

  // Wild cards (4 of each)
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `${id++}`, color: 'wild', type: 'wild' });
    deck.push({ id: `${id++}`, color: 'wild', type: 'wild_draw_four' });
  }

  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function canPlayCard(card: Card, topCard: Card): boolean {
  if (card.color === 'wild') return true;
  if (card.color === topCard.color) return true;
  if (card.type === topCard.type) return true;
  if (card.type === 'number' && topCard.type === 'number' && card.number === topCard.number) {
    return true;
  }
  return false;
}

export function getCardColor(card: Card): string {
  const colorMap: Record<CardColor, string> = {
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    wild: '#8b5cf6',
  };
  return colorMap[card.color];
}

export function getCardDisplay(card: Card): string {
  if (card.type === 'number') return card.number!.toString();
  if (card.type === 'skip') return 'SKIP';
  if (card.type === 'reverse') return 'REV';
  if (card.type === 'draw_two') return '+2';
  if (card.type === 'wild') return 'WILD';
  if (card.type === 'wild_draw_four') return '+4';
  return '';
}

import { Suit, Rank, Card, Player, GameState, GameStage, Difficulty } from '../types';

const getCardValue = (rank: Rank): number => {
  switch (rank) {
    case Rank.Two: return 2;
    case Rank.Three: return 3;
    case Rank.Four: return 4;
    case Rank.Five: return 5;
    case Rank.Six: return 6;
    case Rank.Seven: return 7;
    case Rank.Eight: return 8;
    case Rank.Nine: return 9;
    case Rank.Ten: return 10;
    case Rank.Jack: return 11;
    case Rank.Queen: return 12;
    case Rank.King: return 13;
    case Rank.Ace: return 14;
    default: return 0;
  }
};

export const createDeck = (): Card[] => {
  const suits = Object.values(Suit);
  const ranks = Object.values(Rank);
  const deck: Card[] = [];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        suit,
        rank,
        value: getCardValue(rank),
        id: `${rank}-${suit}`,
      });
    });
  });

  // Modify deck for Quatch rules: only one '2' and one '10'
  const randomSuitForTwo = suits[Math.floor(Math.random() * suits.length)];
  const randomSuitForTen = suits[Math.floor(Math.random() * suits.length)];

  const finalDeck = deck.filter(card => card.rank !== Rank.Two && card.rank !== Rank.Ten);
  
  finalDeck.push({ suit: randomSuitForTwo, rank: Rank.Two, value: getCardValue(Rank.Two), id: `${Rank.Two}-${randomSuitForTwo}`});
  finalDeck.push({ suit: randomSuitForTen, rank: Rank.Ten, value: getCardValue(Rank.Ten), id: `${Rank.Ten}-${randomSuitForTen}`});

  return finalDeck;
};

export const shuffleDeck = <T,>(array: T[]): T[] => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

export const initializeGame = (playerNames: string[]): GameState => {
    const players: Player[] = playerNames.map((name, index) => ({
        id: index,
        name: name,
        hand: [],
        lastChance: [null, null, null],
        lastStand: [null, null, null],
        isAI: index !== 0, // Player 0 is the human
        cardsEaten: 0,
    }));
    const deck = shuffleDeck(createDeck());

    return {
        players,
        deck,
        mpa: [],
        bin: [],
        currentPlayerId: -1, // No player starts until dealing
        stage: GameStage.SETUP,
        isPlayerTurn: false,
        winner: null,
        turnDirection: 1,
        turnCount: 0,
        gameStartTime: Date.now(),
    };
};

export const isValidPlay = (selectedCards: Card[], targetCard: Card | undefined, player?: Player): boolean => {
    if (selectedCards.length === 0) return false;

    // All selected cards must be the same rank
    const firstCardRank = selectedCards[0].rank;
    if (!selectedCards.every(card => card.rank === firstCardRank)) return false;

    const playCard = selectedCards[0];

    // If it's the final play to win, it cannot be a special card.
    if (player) {
        const isFromHand = player.hand.some(c => selectedCards.some(sc => sc.id === c.id));
        const isFromLastChance = player.lastChance.some(c => c && selectedCards.some(sc => sc.id === c.id));

        const lastChanceCount = player.lastChance.filter(c => c !== null).length;
        const lastStandCount = player.lastStand.filter(c => c !== null).length;

        let isWinningPlay = false;
        if (isFromHand) {
            isWinningPlay = player.hand.length === selectedCards.length && lastChanceCount === 0 && lastStandCount === 0;
        } else if (isFromLastChance) {
            isWinningPlay = player.hand.length === 0 && lastChanceCount === selectedCards.length && lastStandCount === 0;
        } else { // Implicitly Last Stand
            isWinningPlay = player.hand.length === 0 && lastChanceCount === 0 && lastStandCount === selectedCards.length;
        }
        
        if (isWinningPlay && (playCard.rank === Rank.Two || playCard.rank === Rank.Ten)) {
            return false;
        }
    }

    // A '2' or '10' can be played on anything
    if (playCard.rank === Rank.Two || playCard.rank === Rank.Ten) return true;

    // If MPA is empty, any card is valid (unless it's a reset)
    if (!targetCard) return true;

    // If top card is a '2' (reset), any card is valid
    if (targetCard.rank === Rank.Two) return true;
    
    // Normal play: value must be >= target
    return playCard.value >= targetCard.value;
};

export const playerHasValidMove = (player: Player, targetCard: Card | undefined): boolean => {
    const lastChanceCount = player.lastChance.filter(c => c !== null).length;

    // During last stand, the player's only move is to pick a card. They cannot choose to eat.
    if (player.hand.length === 0 && lastChanceCount === 0) {
        return true; 
    }

    const sourcePile = (player.hand.length > 0 ? player.hand : player.lastChance).filter((c): c is Card => c !== null);

    // Check for single card plays
    for (const card of sourcePile) {
        if (isValidPlay([card], targetCard, player)) {
            return true;
        }
    }
    
    // Check for multi-card plays
    const rankGroups = sourcePile.reduce((acc, card) => {
        acc[card.rank] = acc[card.rank] || [];
        acc[card.rank].push(card);
        return acc;
    }, {} as Record<Rank, Card[]>);

    for (const rank in rankGroups) {
        const group = rankGroups[rank as Rank];
        if (group.length > 1 && isValidPlay(group, targetCard, player)) {
            return true;
        }
    }

    return false;
};

export const getAIStartingCard = (player: Player): Card[] => {
    if (player.hand.length === 0) {
        return [];
    }

    // Filter out special cards for the initial play, as per game rules.
    const startableCards = player.hand.filter(c => c.rank !== Rank.Two && c.rank !== Rank.Ten);

    if (startableCards.length === 0) {
        // If AI only has special cards, it cannot make a starting play and automatically loses the initial play-off.
        return [];
    }

    // Find the lowest value card in the startable hand
    const lowestValue = Math.min(...startableCards.map(c => c.value));
    
    // Return all cards with that lowest value
    return startableCards.filter(c => c.value === lowestValue);
};

const getAllPossiblePlays = (player: Player, targetCard: Card | undefined, difficulty: Difficulty): Card[][] => {
    const possiblePlays: Card[][] = [];
    const sourcePile = (player.hand.length > 0 ? player.hand : player.lastChance).filter((c): c is Card => c !== null);

    // Group cards by rank
    const rankGroups = sourcePile.reduce((acc, card) => {
        acc[card.rank] = acc[card.rank] || [];
        acc[card.rank].push(card);
        return acc;
    }, {} as Record<Rank, Card[]>);

    for (const rank in rankGroups) {
        const group = rankGroups[rank as Rank];
        
        if (difficulty === 'Hard' || difficulty === 'Extreme') {
            // Hard/Extreme can play subsets of cards
            for (let i = 1; i <= group.length; i++) {
                const subset = group.slice(0, i);
                if (isValidPlay(subset, targetCard, player)) {
                    possiblePlays.push(subset);
                }
            }
        } else {
            // Easy/Medium must play all cards of a rank at once
            if (isValidPlay(group, targetCard, player)) {
                possiblePlays.push(group);
            }
        }
    }
    return possiblePlays;
};


export const getAIPlay = (player: Player, targetCard: Card | undefined, mpaSize: number, deckSize: number, difficulty: Difficulty): Card[] => {
    const lastChanceCount = player.lastChance.filter(c => c !== null).length;
    const lastStandCount = player.lastStand.filter(c => c !== null).length;

    if (player.hand.length === 0 && lastChanceCount === 0 && lastStandCount > 0) {
        // Last Stand phase: AI must pick a random card.
        // We need to pick from available slots.
        const availableIndices = player.lastStand
            .map((c, i) => c !== null ? i : -1)
            .filter(i => i !== -1);

        if (availableIndices.length === 0) return []; // Should not happen if count > 0

        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        // The calling code expects a Card[], but needs to know which card was picked.
        // The calling code in App.tsx finds the card in lastStand array to remove it.
        // So returning the card object is sufficient.
        const pickedCard = player.lastStand[randomIndex];
        return pickedCard ? [pickedCard] : [];
    }

    const playableCards = getAllPossiblePlays(player, targetCard, difficulty);

    if (playableCards.length === 0) {
        return []; // AI must eat
    }

    // --- Difficulty-specific strategies ---

    if (difficulty === 'Easy') {
        // Always play the lowest possible value card(s).
        playableCards.sort((a, b) => a[0].value - b[0].value);
        return playableCards[0];
    }
    
    const specialPlays = playableCards.filter(play => play[0].rank === Rank.Two || play[0].rank === Rank.Ten);
    const normalPlays = playableCards.filter(play => play[0].rank !== Rank.Two && play[0].rank !== Rank.Ten);

    if (difficulty === 'Medium') {
        const isPressureSituation = mpaSize >= 5 || (deckSize <= 10 && mpaSize >= 3);
        if (normalPlays.length > 0) {
            if (isPressureSituation) {
                // High-pressure: play highest value card to force an eat.
                normalPlays.sort((a, b) => b[0].value - a[0].value || b.length - a.length);
                return normalPlays[0];
            } else {
                // Normal situation: play lowest value card to conserve high cards.
                normalPlays.sort((a, b) => a[0].value - b[0].value || b.length - a.length);
                return normalPlays[0];
            }
        }
        if (specialPlays.length > 0) {
            // Prioritize '10' for another turn and to clear the pile.
            const tenPlay = specialPlays.find(play => play[0].rank === Rank.Ten);
            if (tenPlay) return tenPlay;
            const twoPlay = specialPlays.find(play => play[0].rank === Rank.Two);
            if (twoPlay) return twoPlay;
        }
    }

    if (difficulty === 'Hard' || difficulty === 'Extreme') {
        const isExtremePressure = difficulty === 'Extreme' && (mpaSize >= 3 || (deckSize <= 15 && mpaSize >= 2));
        const isHardPressure = mpaSize >= 5 || (deckSize <= 10 && mpaSize >= 3);

        // 1. Strategic '10' Use: Clear a valuable pile or chain plays.
        const tenPlay = specialPlays.find(play => play[0].rank === Rank.Ten);
        if (tenPlay && (mpaSize >= (difficulty === 'Extreme' ? 3 : 5))) {
            return tenPlay;
        }

        // 2. Pressure Play: Force an eat with a high card.
        if (isHardPressure || isExtremePressure) {
            if (normalPlays.length > 0) {
                 // Sort by highest value, but prefer playing fewer cards to save others
                normalPlays.sort((a, b) => {
                    if (b[0].value !== a[0].value) return b[0].value - a[0].value;
                    return a.length - b.length; 
                });
                return normalPlays[0];
            }
        }

        // 3. Normal Play: Conserve high cards and special cards.
        if (normalPlays.length > 0) {
            // Play lowest value card.
            normalPlays.sort((a, b) => {
                if (a[0].value !== b[0].value) return a[0].value - b[0].value;
                // Extreme dumps more cards to thin hand; Hard conserves options.
                return difficulty === 'Extreme' ? b.length - a.length : a.length - b.length;
            });
            return normalPlays[0];
        }

        // 4. Forced Special Play: No other options, must use a special card.
        if (specialPlays.length > 0) {
            if (tenPlay) return tenPlay; // Prefer '10' for another turn.
            const twoPlay = specialPlays.find(play => play[0].rank === Rank.Two);
            if (twoPlay) return twoPlay; // Use '2' to reset.
        }
    }

    // Fallback: should not be reachable if playableCards has items.
    return playableCards[0] || [];
};

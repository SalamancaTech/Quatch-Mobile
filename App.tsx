import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card as CardType, GameState, Player, GameStage, Rank, Difficulty } from './types';
import { initializeGame, isValidPlay, getAIPlay, playerHasValidMove, getAIStartingCard, shuffleDeck } from './utils/gameLogic';
import PlayerArea from './components/PlayerArea';
import GameBoard from './components/GameBoard';
import AnimatedCard from './components/AnimatedCard';
import SpecialEffect from './components/SpecialEffect';
import BinViewModal from './components/BinViewModal';
import GameOverModal from './components/GameMessage';
import DifficultyModal from './components/DifficultyModal';
import GameRulesModal from './components/GameRulesModal';
import EditNamesModal from './components/EditNamesModal';
import NumberOfPlayersModal from './components/NumberOfPlayersModal';
import StatisticsModal from './components/StatisticsModal';
import { LAYOUT_CONSTANTS } from './constants';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, TouchSensor, DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import Card from './components/Card';
import { DroppableArea } from './components/DroppableArea';

type AnimationState = {
  cards: CardType[];
  startRect: DOMRect;
  endRect: DOMRect;
  playerWhoPlayed: Player;
} | null;

type EatAnimationItem = {
    card: CardType;
    startRect: DOMRect;
    id: string; // for key
}

type DealAnimationItem = {
  card: CardType;
  startRect: DOMRect;
  endRect: DOMRect;
  delay: number;
  isFaceUp: boolean;
  id: string; // for key
};

type RefillAnimationState = {
  items: DealAnimationItem[];
  context: {
    playedCards: CardType[];
    playerWhoPlayed: Player;
  };
} | null;

type SpecialEffectState = {
  type: 'reset' | 'clear';
  rect: DOMRect;
} | null;

type SpecialMessage = {
  text: string;
  type: 'event' | 'prompt';
} | null;

const getPreciseSlotRect = (slotId: string): DOMRect | null => {
    const element = document.getElementById(slotId);
    if (element) {
        return element.getBoundingClientRect();
    }
    return null;
};

const getHandCardFanRect = (handContainerRect: DOMRect, cardIndex: number, totalCards: number, cardWidth: number, cardHeight: number): DOMRect => {
    if (!handContainerRect) return new DOMRect(0,0,0,0);
    
    // Simulate a fanned out position. Overlap by 60% of card width.
    const effectiveCardSpacing = cardWidth * 0.4; // Show 40% of the next card
    const totalFanWidth = cardWidth + (totalCards - 1) * effectiveCardSpacing;

    const fanStartX = handContainerRect.left + (handContainerRect.width - totalFanWidth) / 2;
    
    const cardX = fanStartX + cardIndex * effectiveCardSpacing;
    // Align to bottom of container
    const cardY = handContainerRect.bottom - cardHeight;

    return new DOMRect(cardX, cardY, cardWidth, cardHeight);
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [isInvalidPlay, setIsInvalidPlay] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [animationState, setAnimationState] = useState<AnimationState>(null);
  const [eatAnimationState, setEatAnimationState] = useState<EatAnimationItem[] | null>(null);
  const [dealAnimationState, setDealAnimationState] = useState<DealAnimationItem[] | null>(null);
  const [refillAnimationState, setRefillAnimationState] = useState<RefillAnimationState | null>(null);
  const [hiddenCardIds, setHiddenCardIds] = useState(new Set<string>());
  const [isInitialPlay, setIsInitialPlay] = useState(false);
  const [specialEffect, setSpecialEffect] = useState<SpecialEffectState | null>(null);
  const [specialMessage, setSpecialMessage] = useState<SpecialMessage | null>(null);
  const [dealingStep, setDealingStep] = useState(0); // 0: Shuffle, 1: Deal LS, 2: Deal LC, 3: Deal Hand, 4: Done
  const [comboCount, setComboCount] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [isCheatingEnabled, setIsCheatingEnabled] = useState(false);
  const [isBinViewOpen, setIsBinViewOpen] = useState(false);
  const [isDifficultyModalOpen, setIsDifficultyModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isEditNamesModalOpen, setIsEditNamesModalOpen] = useState(false);
  const [isStatisticsModalOpen, setIsStatisticsModalOpen] = useState(false);
  const [isNumPlayersModalOpen, setIsNumPlayersModalOpen] = useState(false);
  const [numOpponents, setNumOpponents] = useState(1);
  const [playerNames, setPlayerNames] = useState<string[]>(['Player 1', 'Opponent 1', 'Opponent 2', 'Opponent 3']);

  // DND State
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<Record<string, any> | null>(null);
  const [handReorderPreview, setHandReorderPreview] = useState<{ id: string, newIndex: number } | null>(null);


  const mpaRef = useRef<HTMLDivElement>(null);
  const playerHandRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const playerLastStandRef = useRef<HTMLDivElement>(null);
  const playerLastChanceRef = useRef<HTMLDivElement>(null);
  const playerCardTableRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require movement of 8px to start drag (allows clicks)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
    setActiveDragData(active.data.current as Record<string, any>);

    // If dragging a card that is selected but not the only one, ensure visual feedback is correct.
    // The visual feedback is handled in DragOverlay.
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
        setHandReorderPreview(null);
        return;
    }

    // Logic for Hand Reordering Preview
    if (
        (active.data.current?.type === 'hand-card' && over.id === 'player-hand-drop-zone') ||
        (active.data.current?.type === 'hand-card' && over.data.current?.type === 'hand-card')
    ) {
        // Calculate where the card is relative to other cards
        // Since we are using absolute positioning, we can check the X coordinate of the pointer
        // But DndKit gives us transforms.
        // Simplification: If dragging over another card, we can assume we want to swap/insert there.
        // Or better: Use the index from data.

        // This part is tricky with absolute positioning.
        // We will try to rely on 'over' target.
        if (over.data.current?.index !== undefined && active.data.current?.index !== undefined) {
            setHandReorderPreview({
                id: active.id as string,
                newIndex: over.data.current.index
            });
        }
    } else {
        setHandReorderPreview(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragData(null);
    setHandReorderPreview(null);

    if (!over || !gameState) return;

    const player = gameState.players.find(p => !p.isAI)!;
    const activeData = active.data.current || {};
    const overData = over.data.current || {};

    // --- 1. Hand Reordering ---
    if (activeData.type === 'hand-card' && (over.id === 'player-hand-drop-zone' || overData.type === 'hand-card')) {
        // If dropped on the container or another card
        if (activeData.index !== undefined) {
             // Calculate new index
             let newIndex = activeData.index;
             if (overData.index !== undefined) {
                 newIndex = overData.index;
             }

             if (newIndex !== activeData.index) {
                 setGameState(prev => {
                     if (!prev) return null;
                     const newPlayers = prev.players.map(p => {
                         if (p.id === player.id) {
                             const newHand = [...p.hand];
                             const [movedCard] = newHand.splice(activeData.index, 1);
                             newHand.splice(newIndex, 0, movedCard);
                             return { ...p, hand: newHand };
                         }
                         return p;
                     });
                     return { ...prev, players: newPlayers };
                 });
             }
        }
        return;
    }

    // --- 2. Playing Cards (Hand -> MPA) ---
    if (activeData.type === 'hand-card' && over.id === 'mpa-drop-zone') {
        const card = activeData.card;
        // Determine cards to play
        let cardsToPlay = [card];

        // If the dragged card is part of a selection, play all selected cards
        if (selectedCards.some(c => c.id === card.id)) {
            cardsToPlay = selectedCards;
        } else {
            // If the dragged card is NOT selected, we play just it (and clear selection).
            setSelectedCards([]);
        }

        // Call the centralized play handler
        handlePlayCards(cardsToPlay);
        return;
    }

    // --- 3. Eating (MPA -> Hand) ---
    if (active.id === 'mpa-stack' && (over.id === 'player-hand-drop-zone' || overData.type === 'hand-card')) {
        handleEat();
        return;
    }

    // --- 4. Swap Phase Logic ---
    if (gameState.stage === GameStage.SWAP) {
        // Hand -> LC Slot
        if (activeData.type === 'hand-card' && overData.type === 'lc-slot') {
            const handIndex = activeData.index;
            const lcIndex = overData.index;
            const handCard = player.hand[handIndex];
            const lcCard = player.lastChance[lcIndex]; // Might be null/undefined if empty (though LC starts full usually)

            setGameState(prev => {
                 if (!prev) return null;
                 const newPlayers = prev.players.map(p => {
                     if (p.id === player.id) {
                         const newHand = [...p.hand];
                         const newLC = [...p.lastChance];

                         // Remove from hand
                         newHand.splice(handIndex, 1);

                         // Swap or Move
                         if (lcCard) {
                             newHand.splice(handIndex, 0, lcCard); // Put LC card in hand at same spot (or push to end?)
                             // Requirement: "the card will replace the card and put the other in their HAND"
                             // Let's keep the order simple, just add it.
                         }

                         newLC[lcIndex] = handCard;

                         return { ...p, hand: newHand.sort((a,b) => a.value - b.value), lastChance: newLC };
                     }
                     return p;
                 });
                 return { ...prev, players: newPlayers };
            });
            return;
        }

        // LC Card -> Hand (or Hand Container)
        if (activeData.type === 'lc-card' && (over.id === 'player-hand-drop-zone' || overData.type === 'hand-card')) {
            const lcIndex = activeData.index;
            const lcCard = player.lastChance[lcIndex];

            setGameState(prev => {
                if (!prev) return null;
                const newPlayers = prev.players.map(p => {
                    if (p.id === player.id) {
                        const newLC = [...p.lastChance];
                        // Remove from LC (set to null or filter? type says Card[], so we filter or recreate array)
                        // Wait, Card[] implies no gaps usually, but the UI shows slots 0,1,2.
                        // Actually types.ts says `lastChance: Card[]`.
                        // If we remove one, the array shrinks. The slots depend on index.
                        // If we have [A, B, C] and move B to hand, do we get [A, C]?
                        // The UI renders `player.lastChance[i]`. If array length is 2, slot 2 is empty.
                        // So yes, we just remove it.

                        // We need to be careful with "slot" targeting if the array shrinks.
                        // If we drag from slot 2 (index 2) but array only has 2 items, that's impossible.
                        // But if we drag from slot 0, array becomes length 2. The old slot 1 becomes slot 0 visually?
                        // No, the UI map is `[0, 1, 2].map(i => ... player.lastChance[i])`.
                        // So if we remove index 0, B moves to slot 0.
                        // This shifts cards.
                        // The user requirement: "all 3 cards could in theory be brought into the hand; the game CANNOT be started however, until all 3 LC cards are in place."
                        // This implies gaps might be allowed or they just shift.
                        // Shifting is fine.

                        // Requirement: "If the player drags the LC card to their HAND, no cards will replace it, the hand will merely adopt the new card"

                        // BUT: We need to support putting cards BACK into empty slots.
                        // If I move all 3 to hand, LC is empty.
                        // I drag a card to "LC Slot 0". It should go there.
                        // If I drag to "LC Slot 1" (which is empty), it should go there.
                        // Since `lastChance` is a simple array, inserting at index might be tricky if it's sparse.
                        // Let's assume we fill from left or we need to change data structure?
                        // "Last Chance" is usually 3 cards. If we support gaps, we need `(Card | null)[]`.
                        // `types.ts` says `Card[]`.
                        // If I have 2 cards, and drag to slot 2, I can't put it at index 2 if length is 2 (index 0,1).
                        // I should probably just push it to the array.
                        // OR: Swap Logic implies specific slots.

                        // Let's stick to: Dragging to ANY LC slot appends to LC array if there's space, or swaps if there's a card.
                        // Actually, if I specifically target Slot 1 and Slot 0 is filled, I expect it to go to Slot 1.
                        // But if the underlying data is `Card[]`, [A, B] means Slot 0 is A, Slot 1 is B.
                        // I can't force B to be at Slot 1 without a placeholder at Slot 0.

                        // For simplicity given the types:
                        // LC -> Hand: Remove from array.
                        // Hand -> LC: Push to array if length < 3. If target was a specific existing card, swap.

                        const newHand = [...p.hand, lcCard].sort((a,b) => a.value - b.value);
                        newLC.splice(lcIndex, 1);

                        return { ...p, hand: newHand, lastChance: newLC };
                    }
                    return p;
                });
                return { ...prev, players: newPlayers };
            });
            return;
        }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 720 && numOpponents !== 1) {
        setNumOpponents(1);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [numOpponents]);

  const resetGame = useCallback((numOpps: number) => {
    const initialPlayerNames = playerNames.slice(0, numOpps + 1);
    setGameState(initializeGame(initialPlayerNames));
    setSelectedCards([]);
    setIsInvalidPlay(false);
    setAnimationState(null);
    setEatAnimationState(null);
    setDealAnimationState(null);
    setRefillAnimationState(null);
    setHiddenCardIds(new Set());
    setIsInitialPlay(false);
    setSpecialEffect(null);
    setSpecialMessage(null);
    setDealingStep(0);
    setIsMenuOpen(false);
    setIsBinViewOpen(false);
    setIsDifficultyModalOpen(false);
    setIsRulesModalOpen(false);
    setIsStatisticsModalOpen(false);
  }, [playerNames]);

  useEffect(() => {
    resetGame(numOpponents);
  }, [numOpponents, resetGame]);

  useEffect(() => {
    if (!gameState || gameState.mpa.length < 2) {
      setComboCount(0);
      return;
    }
    const mpa = gameState.mpa;
    const len = mpa.length;
    const topRank = mpa[len - 1].rank;

    if (len >= 3 && mpa[len - 2].rank === topRank && mpa[len - 3].rank === topRank) {
      setComboCount(3);
    } else if (mpa[len - 2].rank === topRank) {
      setComboCount(2);
    } else {
      setComboCount(0);
    }
  }, [gameState?.mpa]);

  const handleCardSelect = (card: CardType) => {
      // SWAP Phase card selection logic is now mostly handled via Drag and Drop,
      // but we keep click selection for accessibility/fallback.
      // However, the original SWAP selection logic was complex and click-based swapping
      // might conflict or be redundant. For now, we'll keep it as is.
    if (gameState?.stage === GameStage.SWAP) {
      const player = gameState.players.find(p => !p.isAI)!;
      
      const isClickedInHand = player.hand.some(c => c.id === card.id);
      const isClickedInLC = player.lastChance.some(c => c.id === card.id);

      const selected = selectedCards.length === 1 ? selectedCards[0] : null;
      const isSelectedInHand = selected && player.hand.some(c => c.id === selected.id);
      const isSelectedInLC = selected && player.lastChance.some(c => c.id === selected.id);

      if (!selected || (isSelectedInHand && isClickedInHand) || (isSelectedInLC && isClickedInLC)) {
        if (selected?.id === card.id) {
          setSelectedCards([]);
        } else if (isClickedInHand || isClickedInLC) {
          setSelectedCards([card]);
        }
      } 
      else if ((isSelectedInHand && isClickedInLC) || (isSelectedInLC && isClickedInHand)) {
        const card1 = selected!;
        const card2 = card;
        const playerId = player.id;

        setGameState(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                players: prev.players.map(p => {
                    if (p.id === playerId) {
                        const isSelectedInHand = p.hand.some(c => c.id === card1.id);

                        const [cardForHand, cardForLC] = isSelectedInHand ? [card2, card1] : [card1, card2];
                        
                        const newHand = p.hand.filter(c => c.id !== (isSelectedInHand ? card1.id : card2.id)).concat(cardForHand).sort((a,b) => a.value - b.value);
                        const newLastChance = p.lastChance.filter(c => c.id !== (isSelectedInHand ? card2.id : card1.id)).concat(cardForLC);
                        
                        return { ...p, hand: newHand, lastChance: newLastChance };
                    }
                    return p;
                })
            };
        });
        setSelectedCards([]);
      }
      return;
    }

    // Normal card selection logic
    setSelectedCards(prev => {
      const isSelected = prev.some(sc => sc.id === card.id);
      if (isSelected) {
        return prev.filter(sc => sc.id !== card.id);
      } else {
        if (prev.length > 0 && prev[0].rank !== card.rank) {
          return [card];
        }
        return [...prev, card];
      }
    });
  };

  const nextTurn = useCallback((state: GameState, playerWhoPlayedId: number): GameState => {
      const numPlayers = state.players.length;
      const nextPlayerId = (playerWhoPlayedId + state.turnDirection + numPlayers) % numPlayers;
      return {
          ...state,
          currentPlayerId: nextPlayerId,
          isPlayerTurn: nextPlayerId === 0,
          turnCount: state.turnCount + 1,
      };
  }, []);

  const finalizeTurn = (playedCards: CardType[], playerWhoPlayed: Player) => {
    setGameState(prevState => {
        if (!prevState) return null;

        let mpaCopy = [...prevState.mpa];
        let binCopy = [...prevState.bin];

        const playedCard = playedCards[0];
        let playerPlaysAgain = false;
        let clearMpa = false;
    
        if (playedCard.rank === '10') {
          playerPlaysAgain = true;
          clearMpa = true;
        } else if (mpaCopy.length >= 4) {
          // Check includes the newly played card which is already in the mpa state at this point
          const topFourCards = mpaCopy.slice(-4);
          if (topFourCards.every(c => c.rank === playedCard.rank)) {
            playerPlaysAgain = true;
            clearMpa = true;
          }
        }

        if (clearMpa) {
            binCopy = [...binCopy, ...mpaCopy];
            mpaCopy = [];
        }
        
        const stateAfterPlay: GameState = {
            ...prevState,
            mpa: mpaCopy,
            bin: binCopy,
        };
        
        const playerAfterUpdate = stateAfterPlay.players.find(p => p.id === playerWhoPlayed.id)!;
        const playerHasWon = playerAfterUpdate.hand.length === 0 && playerAfterUpdate.lastChance.length === 0 && playerAfterUpdate.lastStand.length === 0;

        if (playerHasWon) {
            return {
                ...stateAfterPlay,
                winner: playerAfterUpdate,
                stage: GameStage.GAME_OVER,
            };
        }

        if (playerPlaysAgain) {
            return stateAfterPlay; // Return state without changing turn
        }

        return nextTurn(stateAfterPlay, stateAfterPlay.currentPlayerId);
    });
  };

  const completeRefill = () => {
    if (!refillAnimationState) return;
    const { items, context } = refillAnimationState;
    const drawnCards = items.map(i => i.card);

    setGameState(prevState => {
      if (!prevState) return null;
      
      const newPlayers = prevState.players.map(p => {
        if (p.id === context.playerWhoPlayed.id) {
          const newHand = [...p.hand, ...drawnCards].sort((a,b) => a.value - b.value);
          return { ...p, hand: newHand };
        }
        return p;
      });
      // Correctly remove drawn cards from the top of the deck.
      const newDeck = prevState.deck.slice(drawnCards.length);

      return { ...prevState, players: newPlayers, deck: newDeck };
    });

    setRefillAnimationState(null);
    finalizeTurn(context.playedCards, context.playerWhoPlayed);
  };

  const initiateRefillAnimation = (cardsToDraw: CardType[], playerWhoPlayed: Player, playedCards: CardType[]) => {
    const startRect = deckRef.current?.getBoundingClientRect();
    const endRect = playerWhoPlayed.isAI ? document.getElementById(`opponent-${playerWhoPlayed.id}-hand-container`)?.getBoundingClientRect() : playerHandRef.current?.getBoundingClientRect();

    if (!startRect || !endRect) {
      console.error("Refs missing for refill animation.");
      // Instantly complete if refs are missing
      const drawnCards = cardsToDraw;
      setGameState(prevState => {
          if (!prevState) return null;
          const newPlayers = prevState.players.map(p => p.id === playerWhoPlayed.id ? { ...p, hand: [...p.hand, ...drawnCards].sort((a,b) => a.value - b.value) } : p);
          const newDeck = prevState.deck.slice(drawnCards.length);
          return { ...prevState, players: newPlayers, deck: newDeck };
      });
      finalizeTurn(playedCards, playerWhoPlayed);
      return;
    }

    const animations: DealAnimationItem[] = cardsToDraw.map((card, index) => ({
      card,
      startRect,
      endRect,
      delay: index * 100,
      isFaceUp: !playerWhoPlayed.isAI,
      id: `refill-${card.id}-${index}`
    }));

    setRefillAnimationState({ items: animations, context: { playedCards, playerWhoPlayed } });
  }

  const handlePlayComplete = (playedCards: CardType[], playerWhoPlayed: Player) => {
    const currentState = gameState!;
    const playerInCurrentState = currentState.players.find(p => p.id === playerWhoPlayed.id)!;
    
    let cardsToDraw: CardType[] = [];

    const playedCard = playedCards[0];
    
    // Check for clear event to defer drawing cards
    let isClearEvent = false;
    if (playedCard.rank === Rank.Ten) {
        isClearEvent = true;
    }
    const mpaForCheck = [...currentState.mpa, ...playedCards];
    if (mpaForCheck.length >= 4 && mpaForCheck.slice(-4).every(c => c.rank === playedCard.rank)) {
        isClearEvent = true;
    }

    // Use playerWhoPlayed (state before card removal) to determine where cards came from.
    const wasPlayFromHand = playerWhoPlayed.hand.some(c => playedCards.some(pc => pc.id === c.id));

    if (wasPlayFromHand) {
        // playerInCurrentState.hand is already the hand after playing cards.
        const handAfterPlay = playerInCurrentState.hand;
        const mustRefillNow = handAfterPlay.length === 0;
        
        // Defer refill on clear events, unless hand is empty.
        if (!isClearEvent || mustRefillNow) {
            const cardsNeeded = 3 - handAfterPlay.length;
            if (cardsNeeded > 0 && currentState.deck.length > 0) {
                const numToDraw = Math.min(cardsNeeded, currentState.deck.length);
                // Draw from the top of the deck (consistent with initial deal)
                cardsToDraw = currentState.deck.slice(0, numToDraw);
            }
        }
    }
    // Note: Last Stand/Chance removal is handled before the animation starts, so no extra logic needed here.
    
    if (mpaForCheck.length >= 4 && mpaForCheck.slice(-4).every(c => c.rank === playedCard.rank)) {
      setSpecialMessage({ text: "4 OF A KIND!", type: 'event' });
    } else if (playedCard.rank === Rank.Ten) {
      setSpecialMessage({ text: "Cleared!", type: 'event' });
    } else if (playedCard.rank === Rank.Two) {
      setSpecialMessage({ text: "Reset!", type: 'event' });
    }

    if ((playedCard.rank === Rank.Two || playedCard.rank === Rank.Ten) && mpaRef.current) {
      const rect = mpaRef.current.getBoundingClientRect();
      setSpecialEffect({ type: playedCard.rank === Rank.Two ? 'reset' : 'clear', rect });
    }

    setGameState(prevState => {
      if (!prevState) return null;
      // This state update mainly just adds card to MPA. Card removal from hand/LC is now done pre-animation.
      // However, we still need to filter here for cases where animation is skipped.
      return {
        ...prevState,
        players: prevState.players.map(p => p.id === playerWhoPlayed.id ? { 
            ...p, 
            hand: p.hand.filter(c => !playedCards.some(sc => sc.id === c.id)), 
            lastChance: p.lastChance.filter(c => !playedCards.some(sc => sc.id === c.id)) 
        } : p),
        mpa: [...prevState.mpa, ...playedCards]
      };
    });

    if (cardsToDraw.length > 0) {
      initiateRefillAnimation(cardsToDraw, playerWhoPlayed, playedCards);
    } else {
      finalizeTurn(playedCards, playerWhoPlayed);
    }
  };

  const initiatePlayAnimation = (cards: CardType[], player: Player, overrideStartRect?: DOMRect) => {
    if (!mpaRef.current || cards.length === 0) {
        handlePlayComplete(cards, player);
        return;
    }

    let startRect: DOMRect | undefined = overrideStartRect;
    const endRect = mpaRef.current.getBoundingClientRect();
    
    if (!startRect) {
        if (player.isAI) {
            const opponentRect = document.getElementById(`opponent-${player.id}-hand-container`)?.getBoundingClientRect();
            if (opponentRect) {
                const cardWidth = 96; // from md:w-24 in Card.tsx
                const cardHeight = 144; // from md:h-36 in Card.tsx
                startRect = new DOMRect(
                    opponentRect.left + (opponentRect.width - cardWidth) / 2,
                    opponentRect.top + (opponentRect.height - cardHeight) / 2,
                    cardWidth,
                    cardHeight
                );
            }
        } else {
            const cardToAnimate = cards[0];
            const cardElement = document.getElementById(cardToAnimate.id);
            if (cardElement) {
                startRect = cardElement.getBoundingClientRect();
            }
        }
    }

    if (!startRect) {
        console.error("Could not determine a starting rectangle for the animation.");
        handlePlayComplete(cards, player);
        return;
    }

    setHiddenCardIds(prev => new Set([...prev, ...cards.map(c => c.id)]));

    setAnimationState({
      cards: cards,
      startRect: startRect,
      endRect: endRect,
      playerWhoPlayed: player,
    });
  };

  const handlePlayCards = (cardsToPlay: CardType[] = selectedCards) => {
    if (!gameState || !gameState.isPlayerTurn || cardsToPlay.length === 0 || animationState) return;
    const player = gameState.players.find(p => !p.isAI)!;

    if (isInitialPlay) {
        if (cardsToPlay.length > 0 && (cardsToPlay[0].rank === Rank.Two || cardsToPlay[0].rank === Rank.Ten)) {
            setIsInvalidPlay(true);
            setTimeout(() => setIsInvalidPlay(false), 500);
            setSelectedCards([]);
            setSpecialMessage({ text: "CAN'T START WITH 2 OR 10", type: 'event' });
            return;
        }

        const aiChoices = aiPlayers.map(ai => ({ player: ai, cards: getAIStartingCard(ai) }));
        const bestAiChoice = aiChoices.reduce((best, current) => {
            if (!best.cards || best.cards.length === 0) return current;
            if (!current.cards || current.cards.length === 0) return best;
            if (current.cards[0].value < best.cards[0].value) return current;
            return best;
        }, { player: aiPlayers[0], cards: [] as CardType[] });

        const playerChoice = cardsToPlay;
        const playerWins = !bestAiChoice.cards || bestAiChoice.cards.length === 0 || playerChoice[0].value <= bestAiChoice.cards[0].value;

        setSelectedCards([]);
        setIsInitialPlay(false);

        if (playerWins) {
            setSpecialMessage({ text: "You go first!", type: 'event' });
            setGameState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    players: prev.players.map(p => p.id === player.id ? { ...p, hand: p.hand.filter(c => !playerChoice.some(sc => sc.id === c.id)) } : p)
                };
            });
            initiatePlayAnimation(playerChoice, player);
        } else { // AI wins
            const winningAI = bestAiChoice.player;
            setSpecialMessage({ text: `${winningAI.name} goes first!`, type: 'event' });
            setGameState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    currentPlayerId: winningAI.id,
                    isPlayerTurn: false,
                    players: prev.players.map(p => p.id === winningAI.id ? { ...p, hand: p.hand.filter(c => !bestAiChoice.cards!.some(sc => sc.id === c.id)) } : p)
                };
            });
            initiatePlayAnimation(bestAiChoice.cards!, winningAI);
        }
        return;
    }

    const targetCard = gameState.mpa.length > 0 ? gameState.mpa[gameState.mpa.length - 1] : undefined;

    if (!isValidPlay(cardsToPlay, targetCard, player)) {
      setIsInvalidPlay(true);
      setTimeout(() => setIsInvalidPlay(false), 500);
      setSelectedCards([]);
      return;
    }

    // Remove cards from state before animating
    setGameState(prev => {
        if (!prev) return null;
        const newPlayers = prev.players.map(p => {
            if (p.id === player.id) {
                return {
                    ...p,
                    hand: p.hand.filter(c => !cardsToPlay.some(sc => sc.id === c.id)),
                    lastChance: p.lastChance.filter(c => !cardsToPlay.some(sc => sc.id === c.id))
                };
            }
            return p;
        });
        return { ...prev, players: newPlayers };
    });

    initiatePlayAnimation(cardsToPlay, player);
    setSelectedCards([]);
  };
  
  const completeEat = useCallback((eatenCards: CardType[]) => {
    setGameState(prevState => {
        if (!prevState) return null;
        
        const eatingPlayerId = prevState.currentPlayerId;

        const newPlayers = prevState.players.map(player => {
            if (player.id === eatingPlayerId) {
                const newHand = [...player.hand, ...eatenCards].sort((a, b) => a.value - b.value);
                return { ...player, hand: newHand, cardsEaten: player.cardsEaten + eatenCards.length };
            }
            return player;
        });

        const stateAfterEat: GameState = { 
          ...prevState, 
          players: newPlayers,
        };
        
        return nextTurn(stateAfterEat, stateAfterEat.currentPlayerId);
    });
    setEatAnimationState(null);
  }, [nextTurn]);

  const initiateEatAnimation = (items: EatAnimationItem[], destination: 'player' | 'opponent') => {
      if (!gameState || items.length === 0) return;
      
      const endRect = (destination === 'player' ? playerHandRef.current?.getBoundingClientRect() : document.getElementById(`opponent-${gameState.currentPlayerId}-hand-container`)?.getBoundingClientRect());
      if (!endRect) return;

      setEatAnimationState(items);
  }

  const handleEat = () => {
    if (!gameState || !gameState.isPlayerTurn || eatAnimationState || gameState.mpa.length === 0) return;
    
    setSpecialMessage({ text: "You Eat!", type: 'event' });
    
    const items: EatAnimationItem[] = gameState.mpa.map(card => ({
        card,
        startRect: mpaRef.current!.getBoundingClientRect(),
        id: `eat-${card.id}`
    }));
    
    initiateEatAnimation(items, 'player');
    setGameState(prev => ({ ...prev!, mpa: [] }));
  };

  const handleMpaClick = () => {
    if (!gameState?.isPlayerTurn || animationState || eatAnimationState) return;

    if (selectedCards.length > 0) {
      handlePlayCards();
      return;
    }
    
    const player = gameState.players.find(p => !p.isAI)!;
    
    // In last stand, player cannot choose to eat.
    if (player.hand.length === 0 && player.lastChance.length === 0) {
        return;
    }

    const targetCard = gameState.mpa.length > 0 ? gameState.mpa[gameState.mpa.length - 1] : undefined;

    if (playerHasValidMove(player, targetCard)) {
      setIsInvalidPlay(true);
      setTimeout(() => setIsInvalidPlay(false), 500);
      return; // Prevent eating
    }

    handleEat();
  };

  const handleLastStandCardSelect = (card: CardType, index: number) => {
    if (!gameState || !gameState.isPlayerTurn || animationState || eatAnimationState) return;
    const player = gameState.players.find(p => !p.isAI)!;
    if (player.hand.length > 0 || player.lastChance.length > 0) return;
    
    // Move Last Stand card to hand
    setGameState(prev => {
        if (!prev) return null;
        const newPlayers = prev.players.map(p => {
            if (p.id === player.id) {
                const newLastStand = [...p.lastStand];
                newLastStand.splice(index, 1);

                // Add to hand and sort
                const newHand = [...p.hand, card].sort((a,b) => a.value - b.value);

                return { ...p, lastStand: newLastStand, hand: newHand };
            }
            return p;
        });
        return { ...prev, players: newPlayers };
    });
  }

  const handleDeckClick = () => {
    if (gameState?.stage !== GameStage.SETUP || dealAnimationState || dealingStep > 3) return;

    const startRect = deckRef.current?.getBoundingClientRect();
    if (!startRect) {
        console.error("Deck ref is missing for dealing animation.");
        return;
    }
    
    // --- Step 0: Shuffle ---
    if (dealingStep === 0) {
        if (deckRef.current) {
            deckRef.current.classList.add('animate-shuffle');
            setTimeout(() => deckRef.current?.classList.remove('animate-shuffle'), 500);
        }
        setGameState(prev => ({ ...prev!, deck: shuffleDeck([...prev!.deck]) }));
        setSpecialMessage({ text: "Shuffled!", type: 'event' });
        setDealingStep(1);
        return;
    }

    // --- Steps 1-3: Dealing Cards ---
    const playerLSRect = playerLastStandRef.current?.getBoundingClientRect();
    const playerLCRect = playerLastChanceRef.current?.getBoundingClientRect();
    const playerHandRect = playerHandRef.current?.getBoundingClientRect();

    if (!playerLSRect || !playerLCRect || !playerHandRect) {
      console.error("A container ref is missing for dealing.");
      return;
    }

    const animations: DealAnimationItem[] = [];
    let delay = 0;
    const delayIncrement = 50;
    const cardWidth = window.innerWidth < 768 ? 80 : 96;
    const cardHeight = window.innerWidth < 768 ? 112 : 144;
    
    const numPlayers = gameState.players.length;
    let currentDeck = [...gameState.deck];

    // --- Deal Last Stand ---
    const lsCardsForStep = currentDeck.slice(0, numPlayers * 3);
    currentDeck = currentDeck.slice(numPlayers * 3);
    const lsCardsToDeal = Array.from({ length: numPlayers }, (_, i) => lsCardsForStep.slice(i * 3, (i + 1) * 3));

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < numPlayers; j++) {
            const player = gameState.players[j];
            const rect = getPreciseSlotRect(`${player.isAI ? `opponent-${player.id}` : 'player'}-ls-slot-${i}`);
            if (rect) {
                animations.push({ card: lsCardsToDeal[j][i], startRect, endRect: rect, delay, isFaceUp: false, id: `deal-ls-${lsCardsToDeal[j][i].id}` });
            }
            delay += delayIncrement;
        }
    }

    // --- Deal Last Chance ---
    const lcCardsForStep = currentDeck.slice(0, numPlayers * 3);
    currentDeck = currentDeck.slice(numPlayers * 3);
    const lcCardsToDeal = Array.from({ length: numPlayers }, (_, i) => lcCardsForStep.slice(i * 3, (i + 1) * 3));

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < numPlayers; j++) {
            const player = gameState.players[j];
            const rect = getPreciseSlotRect(`${player.isAI ? `opponent-${player.id}` : 'player'}-lc-slot-${i}`);
            if (rect) {
                animations.push({ card: lcCardsToDeal[j][i], startRect, endRect: rect, delay, isFaceUp: true, id: `deal-lc-${lcCardsToDeal[j][i].id}` });
            }
            delay += delayIncrement;
        }
    }

    // --- Deal Hand ---
    const handCardsForStep = currentDeck.slice(0, numPlayers * 3);
    currentDeck = currentDeck.slice(numPlayers * 3);
    const handCardsToDeal = Array.from({ length: numPlayers }, (_, i) => handCardsForStep.slice(i * 3, (i + 1) * 3));

    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < numPlayers; j++) {
            const player = gameState.players[j];
            const rect = player.isAI ? document.getElementById(`opponent-${player.id}-hand-container`)?.getBoundingClientRect() : getHandCardFanRect(playerHandRect, i, 3, cardWidth, cardHeight);
            if (rect) {
              animations.push({ card: handCardsToDeal[j][i], startRect, endRect: rect, delay, isFaceUp: !player.isAI, id: `deal-hand-${handCardsToDeal[j][i].id}` });
            }
            delay += delayIncrement;
        }
    }
    
    const finalGameStateUpdate = (prev: GameState): GameState => {
        const newPlayers = prev.players.map((p, i) => ({
            ...p,
            lastStand: lsCardsToDeal[i],
            lastChance: lcCardsToDeal[i],
            hand: p.isAI ? handCardsToDeal[i] : handCardsToDeal[i].sort((a, b) => a.value - b.value),
        }));

        return {
            ...prev,
            players: newPlayers,
            deck: currentDeck, // This is the final remaining deck
            stage: GameStage.SWAP,
            currentPlayerId: -1,
            isPlayerTurn: false,
        };
    };

    setDealingStep(4); // Immediately prevent further clicks
    setDealAnimationState(animations);
    const totalAnimationTime = delay + 700;
    setTimeout(() => {
        setGameState(finalGameStateUpdate);
        setDealAnimationState(null);
        setSpecialMessage({ text: "Change Cards?", type: 'event' });
    }, totalAnimationTime);
  };
  
  const handleStartGame = () => {
      if(!gameState || gameState.stage !== GameStage.SWAP) return;
      setSpecialMessage({ text: "Begin!", type: 'event' });
      setGameState(prev => ({
          ...prev!,
          stage: GameStage.PLAY,
          currentPlayerId: 0,
          isPlayerTurn: true,
      }));
      setIsInitialPlay(true);
      setIsMenuOpen(false);
  }

  const handleSetDifficulty = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    resetGame(numOpponents);
  };

  const handleSelectNumOpponents = (num: number) => {
    setNumOpponents(num);
    setIsNumPlayersModalOpen(false);
  };

  const handleSaveNames = (newNames: string[]) => {
    const finalNames = newNames.map((name, index) => name.trim() || (index === 0 ? 'Player 1' : `Opponent ${index}`));
    setPlayerNames(finalNames);
    setGameState(prev => {
      if (!prev) return null;
      const newPlayers = prev.players.map((p, index) => ({
        ...p,
        name: finalNames[p.id],
      }));
      return { ...prev, players: newPlayers };
    });
    setIsEditNamesModalOpen(false);
  };

  // AI Turn Logic
  useEffect(() => {
    if (gameState && gameState.stage === GameStage.PLAY && gameState.players[gameState.currentPlayerId].isAI && !gameState.winner && !animationState && !eatAnimationState && !refillAnimationState) {
      const turnTimeout = setTimeout(() => {
        const aiPlayer = gameState.players[gameState.currentPlayerId];
        const targetCard = gameState.mpa.length > 0 ? gameState.mpa[gameState.mpa.length - 1] : undefined;
        
        const play = getAIPlay(aiPlayer, targetCard, gameState.mpa.length, gameState.deck.length, difficulty);

        if (aiPlayer.hand.length === 0 && aiPlayer.lastChance.length === 0) {
            // AI Last Stand Logic
            const cardToPlay = play[0];
            const cardIndex = aiPlayer.lastStand.findIndex(c => c.id === cardToPlay.id);

            const startRect = opponentLastStandRef.current?.getBoundingClientRect();
            if (isValidPlay([cardToPlay], targetCard, aiPlayer)) {
                // Remove card from state before animating
                setGameState(prev => {
                    if (!prev) return null;
                    const newPlayers = prev.players.map(p => {
                        if (p.id === aiPlayer.id) {
                            const newLastStand = [...p.lastStand];
                            if (cardIndex > -1) newLastStand.splice(cardIndex, 1);
                            return { ...p, lastStand: newLastStand };
                        }
                        return p;
                    });
                    return { ...prev, players: newPlayers };
                });
                initiatePlayAnimation([cardToPlay], aiPlayer, startRect);
            } else {
                // AI Busts!
                setSpecialMessage({ text: `${aiPlayer.name} Busts!`, type: 'event' });
                // Remove card from state before animating eat
                setGameState(prev => {
                    if (!prev) return null;
                    const newPlayers = prev.players.map(p => {
                        if (p.id === aiPlayer.id) {
                            const newLastStand = [...p.lastStand];
                            if (cardIndex > -1) newLastStand.splice(cardIndex, 1);
                            return { ...p, lastStand: newLastStand };
                        }
                        return p;
                    });
                    return { ...prev, mpa: [] }; // Also clear mpa for animation
                });
                const items: EatAnimationItem[] = gameState.mpa.map(c => ({
                    card: c,
                    startRect: mpaRef.current!.getBoundingClientRect(),
                    id: `eat-${c.id}`
                }));
                if (startRect) {
                    items.push({
                        card: cardToPlay,
                        startRect: startRect,
                        id: `eat-fail-${cardToPlay.id}`
                    });
                }
                initiateEatAnimation(items, 'opponent');
            }
        } else if (play.length > 0) {
            // Normal AI Play
            setGameState(prev => {
                if (!prev) return null;
                const newPlayers = prev.players.map(p => {
                    if (p.id === aiPlayer.id) {
                        return {
                            ...p,
                            hand: p.hand.filter(c => !play.some(sc => sc.id === c.id)),
                            lastChance: p.lastChance.filter(c => !play.some(sc => sc.id === c.id))
                        };
                    }
                    return p;
                });
                return { ...prev, players: newPlayers };
            });
            initiatePlayAnimation(play, aiPlayer);
        } else {
            // AI must eat
            setSpecialMessage({ text: `${aiPlayer.name} Eats!`, type: 'event' });
            const items: EatAnimationItem[] = gameState.mpa.map(card => ({
                card,
                startRect: mpaRef.current!.getBoundingClientRect(),
                id: `eat-${card.id}`
            }));
            initiateEatAnimation(items, 'opponent');
            setGameState(prev => ({ ...prev!, mpa: [] }));
        }
      }, 1000);
      return () => clearTimeout(turnTimeout);
    }
  }, [gameState, animationState, eatAnimationState, refillAnimationState, difficulty]);
  
  if (!gameState) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const humanPlayer = gameState.players.find(p => !p.isAI)!;
  const aiPlayers = gameState.players.filter(p => p.isAI);

  let topPlayer: Player | undefined;
  let leftPlayer: Player | undefined;
  let rightPlayer: Player | undefined;

  if (numOpponents === 1) {
    topPlayer = aiPlayers[0];
  } else if (numOpponents === 2) {
    leftPlayer = aiPlayers[0];
    rightPlayer = aiPlayers[1];
  } else if (numOpponents === 3) {
    leftPlayer = aiPlayers[0];
    topPlayer = aiPlayers[1];
    rightPlayer = aiPlayers[2];
  }

  const eatenCardsForCompletion = eatAnimationState?.map(item => item.card);

  const renderSpecialEventMessage = () => {
    if (!specialMessage || specialMessage.type !== 'event') return null;

    const getMessageStyle = () => {
        const text = specialMessage.text;
        const isActionMessage = /eats!|busts!/i.test(text) || text === "CAN'T START WITH 2 OR 10";

        if (isActionMessage) {
            return { colorClass: 'text-red-500', animationClass: 'animate-four-of-a-kind', shadowStyle: { textShadow: '0 0 8px rgba(255, 255, 255, 0.5), 0 0 15px #ef4444, 0 0 25px #dc2626' } };
        }

        switch(text) {
            case 'Change Cards?':
                return { colorClass: 'text-yellow-300', animationClass: 'animate-four-of-a-kind', shadowStyle: { textShadow: '0 0 10px #ff0, 0 0 20px #ff0' } };
            case 'Begin!':
                return { colorClass: 'text-white', animationClass: 'animate-begin', shadowStyle: { textShadow: '0 0 10px #fff, 0 0 20px #f0f' } };
            default: // For "Cleared!", "Reset!", "4 OF A KIND!", and custom name messages
                return { colorClass: 'text-white', animationClass: 'animate-four-of-a-kind', shadowStyle: { textShadow: '0 0 10px #ff0, 0 0 20px #ff0, 0 0 30px #f0f, 0 0 40px #f0f' } };
        }
    };
    
    const { colorClass, animationClass, shadowStyle } = getMessageStyle();

    return (
         <div 
            className={`text-5xl md:text-7xl font-black ${colorClass} uppercase ${animationClass}`} 
            style={shadowStyle}
        >
            {specialMessage.text}
        </div>
    );
  }

  return (
    <div className="game-board-bg min-h-screen flex flex-col overflow-hidden relative">
      
      {/* Player Name Tags */}
      {gameState.players.map(p => {
        const isHuman = p.id === 0;
        let positionClasses = '';
        let textOrientation = '';
        if (isHuman) {
          positionClasses = 'bottom-0 left-1/2 -translate-x-1/2';
        } else {
          const playerPosition = topPlayer?.id === p.id ? 'top' : leftPlayer?.id === p.id ? 'left' : 'right';
          if (playerPosition === 'top') {
            positionClasses = 'top-0 left-1/2 -translate-x-1/2';
          } else if (playerPosition === 'left') {
            positionClasses = 'top-1/2 left-0 -translate-y-1/2';
            textOrientation = 'transform -rotate-90';
          } else { // right
            positionClasses = 'top-1/2 right-0 -translate-y-1/2';
            textOrientation = 'transform rotate-90';
          }
        }

        return (
          <div key={p.id} className={`fixed ${positionClasses} h-10 flex items-center justify-center z-50 pointer-events-none`}>
            <span
              className={`text-yellow-400 font-bold text-xl uppercase tracking-wider drop-shadow-lg ${textOrientation}`}
              style={{ textShadow: '0 0 10px rgba(250, 204, 21, 0.6), 2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              {p.name}
            </span>
          </div>
        );
      })}

      <div className="flex-grow flex flex-col justify-center items-center pt-12 pb-0 px-2">
        <div 
            className="absolute top-12 left-1/2 -translate-x-1/2 text-white text-sm font-light opacity-25 pointer-events-none select-none"
        >
            created by SalamancaTech
        </div>

        {/* Pop-up Messages Layer */}
        {specialMessage && (
            <div
                className="fixed inset-0 flex items-start justify-center pointer-events-none z-[200] pt-44 text-center px-4"
                onAnimationEnd={() => {
                    if (specialMessage.type === 'event') {
                        setSpecialMessage(null);
                    }
                }}
            >
                {specialMessage.type === 'prompt' ? (
                    <div className="text-4xl md:text-5xl font-bold text-yellow-300 animate-prompt-fade-in" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                        {specialMessage.text}
                    </div>
                ) : renderSpecialEventMessage()}
            </div>
        )}

        {/* Menu & Animation Layer */}
        <div className="absolute top-12 right-4 z-50">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {isMenuOpen && (
            <div className="absolute top-12 right-0 bg-gray-800 rounded-lg shadow-xl py-2 w-56">
                <button onClick={() => resetGame(numOpponents)} className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">New Game</button>
                <button onClick={() => { setIsNumPlayersModalOpen(true); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">Number of Opponents</button>
                <button onClick={() => { setIsDifficultyModalOpen(true); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">Change Difficulty</button>
                <button onClick={() => { setIsEditNamesModalOpen(true); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">Edit Names</button>
                <button onClick={() => { setIsRulesModalOpen(true); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">Game Rules</button>
                <button onClick={() => { setIsStatisticsModalOpen(true); setIsMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">Statistics</button>
                <div className="border-t border-gray-700 my-2"></div>
                <div className="px-4 py-2 flex justify-between items-center text-white">
                    <span>Cheatin'!</span>
                    <button
                    onClick={() => setIsCheatingEnabled(!isCheatingEnabled)}
                    className={`w-12 h-6 rounded-full flex items-center transition-colors ${isCheatingEnabled ? 'bg-yellow-500' : 'bg-gray-600'}`}
                    >
                    <span className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${isCheatingEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>
            )}
        </div>

        {isDifficultyModalOpen && (
            <DifficultyModal
            currentDifficulty={difficulty}
            onSelect={handleSetDifficulty}
            onClose={() => setIsDifficultyModalOpen(false)}
            />
        )}

        {isNumPlayersModalOpen && (
            <NumberOfPlayersModal
                onSelect={handleSelectNumOpponents}
                onClose={() => setIsNumPlayersModalOpen(false)}
            />
        )}

        {isRulesModalOpen && (
            <GameRulesModal onClose={() => setIsRulesModalOpen(false)} />
        )}

        {isEditNamesModalOpen && (
            <EditNamesModal
            currentNames={playerNames}
            numOpponents={numOpponents}
            onSave={handleSaveNames}
            onClose={() => setIsEditNamesModalOpen(false)}
            />
        )}

        {isStatisticsModalOpen && gameState && (
            <StatisticsModal
                gameState={gameState}
                humanPlayer={humanPlayer}
                aiPlayers={aiPlayers}
                difficulty={difficulty}
                onClose={() => setIsStatisticsModalOpen(false)}
            />
        )}

        {specialEffect && (
            <SpecialEffect
            type={specialEffect.type}
            rect={specialEffect.rect}
            onComplete={() => setSpecialEffect(null)}
            />
        )}

        {isBinViewOpen && (
            <BinViewModal cards={gameState.bin} onClose={() => setIsBinViewOpen(false)} difficulty={difficulty}/>
        )}

        {dealAnimationState && dealAnimationState.map((anim, index) => (
            <AnimatedCard
                key={anim.id}
                card={anim.card}
                startRect={anim.startRect}
                endRect={anim.endRect}
                animationType="play"
                delay={anim.delay}
                zIndex={index}
                isFaceUp={anim.isFaceUp}
                onAnimationEnd={() => {}}
                difficulty={difficulty}
            />
        ))}
        {refillAnimationState && refillAnimationState.items.map((anim, index) => (
            <AnimatedCard
                key={anim.id}
                card={anim.card}
                startRect={anim.startRect}
                endRect={anim.endRect}
                animationType="play"
                delay={anim.delay}
                zIndex={index + 20}
                isFaceUp={anim.isFaceUp}
                onAnimationEnd={() => {
                    if (index === refillAnimationState.items.length - 1) {
                        completeRefill();
                    }
                }}
                difficulty={difficulty}
            />
        ))}
        {animationState && animationState.cards.map((card, index) => (
            <AnimatedCard
            key={card.id}
            card={card}
            startRect={animationState.startRect}
            endRect={animationState.endRect}
            animationType="play"
            delay={index * 50}
            zIndex={index}
            onAnimationEnd={() => {
                if (index === animationState.cards.length - 1) {
                handlePlayComplete(animationState.cards, animationState.playerWhoPlayed);
                setAnimationState(null);
                setHiddenCardIds(new Set());
                }
            }}
            difficulty={difficulty}
            />
        ))}
        {eatAnimationState && eatAnimationState.map((item, index) => {
            const destination = gameState.players[gameState.currentPlayerId].isAI ? document.getElementById(`opponent-${gameState.currentPlayerId}-hand-container`) : playerHandRef.current;
            return (
                <AnimatedCard
                key={item.id}
                card={item.card}
                startRect={item.startRect}
                endRect={destination!.getBoundingClientRect()}
                animationType="eat"
                delay={index * 50}
                zIndex={index}
                isFaceUp={true} // Reveal eaten cards
                onAnimationEnd={() => {
                    if (index === eatAnimationState.length - 1) {
                    completeEat(eatenCardsForCompletion!);
                    }
                }}
                difficulty={difficulty}
                />
            );
        })}

        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
        {/* --- Main Game Grid --- */}
        <div className="relative w-full flex-grow flex items-center justify-center pointer-events-none">

          {topPlayer && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 pointer-events-none z-10">
              <PlayerArea
                player={topPlayer}
                isCurrentPlayer={gameState.currentPlayerId === topPlayer.id}
                selectedCards={[]}
                onCardSelect={() => {}}
                currentStage={gameState.stage}
                hiddenCardIds={hiddenCardIds}
                difficulty={difficulty}
                position="top"
              />
            </div>
          )}

          {leftPlayer && (
            <div className="fixed left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <PlayerArea
                player={leftPlayer}
                isCurrentPlayer={gameState.currentPlayerId === leftPlayer.id}
                selectedCards={[]}
                onCardSelect={() => {}}
                currentStage={gameState.stage}
                hiddenCardIds={hiddenCardIds}
                difficulty={difficulty}
                position="left"
              />
            </div>
          )}

          {rightPlayer && (
            <div className="fixed right-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <PlayerArea
                player={rightPlayer}
                isCurrentPlayer={gameState.currentPlayerId === rightPlayer.id}
                selectedCards={[]}
                onCardSelect={() => {}}
                currentStage={gameState.stage}
                hiddenCardIds={hiddenCardIds}
                difficulty={difficulty}
                position="right"
              />
            </div>
          )}

          {/* Game Board Wrapper */}
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                {gameState.stage === GameStage.SWAP && (
                    <button
                    onClick={handleStartGame}
                    disabled={humanPlayer.lastChance.filter(c => c).length < 3}
                    className={`mb-4 px-8 py-3 bg-yellow-500 text-gray-900 font-bold rounded-lg shadow-lg transition-colors z-20 transform ${humanPlayer.lastChance.filter(c => c).length < 3 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-400 hover:scale-105'}`}
                    >
                    Start Game
                    </button>
                )}
                <GameBoard
                    deckCount={gameState.deck.length}
                    mpa={gameState.mpa}
                    binCount={gameState.bin.length}
                    onMpaClick={handleMpaClick}
                    isPlayerTurn={gameState.isPlayerTurn}
                    hasSelectedCards={selectedCards.length > 0}
                    isInvalidPlay={isInvalidPlay}
                    stage={gameState.stage}
                    onDeckClick={handleDeckClick}
                    mpaRef={mpaRef}
                    deckRef={deckRef}
                    isEating={!!eatAnimationState && eatAnimationState.length > 0}
                    dealingStep={dealingStep}
                    isCheatingEnabled={isCheatingEnabled}
                    onBinClick={() => setIsBinViewOpen(true)}
                    difficulty={difficulty}
                    comboCount={comboCount}
                />
            </div>

            {/* Player's Controls & Area */}
          <div className="absolute bottom-0 left-0 w-full flex justify-center z-30 pointer-events-auto">
                {/* Wrap the player area in a droppable for general 'Drop to Hand' actions */}
                <DroppableArea id="player-hand-drop-zone" className="w-full flex justify-center">
                    <PlayerArea
                        player={humanPlayer}
                        isCurrentPlayer={gameState.currentPlayerId === humanPlayer.id}
                        selectedCards={selectedCards}
                        position="bottom"
                        onCardSelect={handleCardSelect}
                        onLastStandCardSelect={handleLastStandCardSelect}
                        currentStage={gameState.stage}
                        hiddenCardIds={hiddenCardIds}
                        playerHandRef={playerHandRef}
                        lastStandRef={playerLastStandRef}
                        lastChanceRef={playerLastChanceRef}
                        cardTableRef={playerCardTableRef}
                        isInitialPlay={isInitialPlay}
                        difficulty={difficulty}
                        activeDragId={activeDragId}
                        handReorderPreview={handReorderPreview}
                    />
                </DroppableArea>
            </div>
        </div>
        <DragOverlay dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
            {activeDragId && (
                <div className="opacity-100 scale-110 cursor-grabbing shadow-2xl rounded-lg" style={{ touchAction: 'none', transform: 'rotate(3deg)' }}>
                    {activeDragId === 'mpa-stack' ? (
                       <div className="relative w-20 h-28 md:w-24 md:h-36">
                          {gameState.mpa.slice(-3).map((card, index) => (
                             <div key={card.id} className="absolute inset-0" style={{ transform: `translateX(${index * 4}px) translateY(${index * 4}px)`}}>
                                 <Card card={card} isFaceUp={true} difficulty={difficulty}/>
                             </div>
                           ))}
                       </div>
                    ) : (
                        <div className="relative">
                           {activeDragData?.card ? (
                                selectedCards.length > 1 && selectedCards.some(c => c.id === activeDragData.card.id) ? (
                                    // Render stack if dragging multiple
                                    <div className="relative w-20 h-28 md:w-24 md:h-36">
                                        {selectedCards.map((c, i) => (
                                            <div key={c.id} className="absolute inset-0" style={{ transform: `translate(${i*4}px, ${-i*4}px)` }}>
                                                <Card card={c} isFaceUp={true} difficulty={difficulty} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <Card card={activeDragData.card} isFaceUp={true} difficulty={difficulty}/>
                                )
                           ) : null}
                        </div>
                    )}
                </div>
            )}
        </DragOverlay>
        </DndContext>
      </div>


      {gameState.stage === GameStage.GAME_OVER && gameState.winner && (
          <GameOverModal
            winner={gameState.winner}
            humanPlayer={humanPlayer}
            aiPlayers={aiPlayers}
            turnCount={gameState.turnCount}
            gameDuration={Math.round((Date.now() - gameState.gameStartTime) / 1000)}
            difficulty={difficulty}
            onPlayAgain={() => resetGame(numOpponents)}
          />
      )}
    </div>
  );
};

export default App;
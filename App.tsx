import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card as CardType, GameState, Player, GameStage, Rank, Difficulty, Suit } from './types';
import { initializeGame, isValidPlay, getAIPlay, playerHasValidMove, getAIStartingCard, shuffleDeck } from './utils/gameLogic';
import { getCardDimensions } from './utils/layoutUtils';
import PlayerArea from './components/PlayerArea';
import GameBoard from './components/GameBoard';
import AnimatedCard from './components/AnimatedCard';
import SpecialEffect from './components/SpecialEffect';
import BinViewModal from './components/BinViewModal';
import GameOverModal from './components/GameMessage';
import DifficultyModal from './components/DifficultyModal';
import GameRulesModal from './components/GameRulesModal';
import EditNamesModal from './components/EditNamesModal';
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

type ShuffleAnimationItem = {
    id: string;
    card: CardType | null; // null for back of card
    startRect: DOMRect;
    endRect: DOMRect;
    animationType: 'shuffle-split' | 'shuffle-riffle';
    delay: number;
    zIndex: number;
};

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
  const [shuffleAnimationState, setShuffleAnimationState] = useState<ShuffleAnimationItem[] | null>(null);
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
  const [numOpponents] = useState(1);
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
  const opponentLastStandRef = useRef<HTMLDivElement>(null);

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
        if (activeData.index !== undefined) {
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
        let cardsToPlay = [card];

        if (selectedCards.some(c => c.id === card.id)) {
            cardsToPlay = selectedCards;
        } else {
            setSelectedCards([]);
        }

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
        if (activeData.type === 'hand-card' && overData.type === 'lc-slot') {
            const handIndex = activeData.index;
            const lcIndex = overData.index;
            const handCard = player.hand[handIndex];
            const lcCard = player.lastChance[lcIndex];

            setGameState(prev => {
                 if (!prev) return null;
                 const newPlayers = prev.players.map(p => {
                     if (p.id === player.id) {
                         const newHand = [...p.hand];
                         const newLC = [...p.lastChance];

                         newHand.splice(handIndex, 1);

                         if (lcCard) {
                             newHand.splice(handIndex, 0, lcCard);
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

        if (activeData.type === 'lc-card' && (over.id === 'player-hand-drop-zone' || overData.type === 'hand-card')) {
            const lcIndex = activeData.index;
            const lcCard = player.lastChance[lcIndex];

            setGameState(prev => {
                if (!prev) return null;
                const newPlayers = prev.players.map(p => {
                    if (p.id === player.id) {
                        const newLC = [...p.lastChance];
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


  const resetGame = useCallback((numOpps: number) => {
    const initialPlayerNames = playerNames.slice(0, numOpps + 1);
    setGameState(initializeGame(initialPlayerNames));
    setSelectedCards([]);
    setIsInvalidPlay(false);
    setAnimationState(null);
    setEatAnimationState(null);
    setDealAnimationState(null);
    setRefillAnimationState(null);
    setShuffleAnimationState(null);
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
    resetGame(1);
  }, [resetGame]);

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
    
    let isClearEvent = false;
    if (playedCard.rank === Rank.Ten) {
        isClearEvent = true;
    }
    const mpaForCheck = [...currentState.mpa, ...playedCards];
    if (mpaForCheck.length >= 4 && mpaForCheck.slice(-4).every(c => c.rank === playedCard.rank)) {
        isClearEvent = true;
    }

    const wasPlayFromHand = playerWhoPlayed.hand.some(c => playedCards.some(pc => pc.id === c.id));

    if (wasPlayFromHand) {
        const handAfterPlay = playerInCurrentState.hand;
        const mustRefillNow = handAfterPlay.length === 0;
        
        if (!isClearEvent || mustRefillNow) {
            const cardsNeeded = 3 - handAfterPlay.length;
            if (cardsNeeded > 0 && currentState.deck.length > 0) {
                const numToDraw = Math.min(cardsNeeded, currentState.deck.length);
                cardsToDraw = currentState.deck.slice(0, numToDraw);
            }
        }
    }
    
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
                const { width: cardWidth, height: cardHeight } = getCardDimensions();
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
    const isSwap = gameState?.stage === GameStage.SWAP;
    if (!gameState || (!gameState.isPlayerTurn && !isSwap) || cardsToPlay.length === 0 || animationState) return;
    const player = gameState.players.find(p => !p.isAI)!;

    if (isSwap) {
        if (player.lastChance.filter(c => c).length < 3) {
            setSpecialMessage({ text: "Fill Last Chance!", type: 'event' });
            return;
        }
    }

    if (isInitialPlay || isSwap) {
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
                    stage: GameStage.PLAY,
                    currentPlayerId: player.id,
                    isPlayerTurn: true,
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
                    stage: GameStage.PLAY,
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
    
    if (player.hand.length === 0 && player.lastChance.length === 0) {
        return;
    }

    const targetCard = gameState.mpa.length > 0 ? gameState.mpa[gameState.mpa.length - 1] : undefined;

    if (playerHasValidMove(player, targetCard)) {
      setIsInvalidPlay(true);
      setTimeout(() => setIsInvalidPlay(false), 500);
      return;
    }

    handleEat();
  };

  const handleLastStandCardSelect = (card: CardType, index: number) => {
    if (!gameState || !gameState.isPlayerTurn || animationState || eatAnimationState) return;
    const player = gameState.players.find(p => !p.isAI)!;
    if (player.hand.length > 0 || player.lastChance.length > 0) return;
    
    setGameState(prev => {
        if (!prev) return null;
        const newPlayers = prev.players.map(p => {
            if (p.id === player.id) {
                const newLastStand = [...p.lastStand];
                newLastStand.splice(index, 1);

                const newHand = [...p.hand, card].sort((a,b) => a.value - b.value);

                return { ...p, lastStand: newLastStand, hand: newHand };
            }
            return p;
        });
        return { ...prev, players: newPlayers };
    });
  }

  const runShuffleSequence = async () => {
      const deckRect = deckRef.current?.getBoundingClientRect();
      if (!deckRect) return;

      const cycles = 3;
      const cardsPerSide = 10;

      const generateItems = (phase: 'split' | 'riffle'): ShuffleAnimationItem[] => {
          const items: ShuffleAnimationItem[] = [];
          const leftOffset = -60;
          const rightOffset = 60;

          for (let i = 0; i < cardsPerSide * 2; i++) {
              const isLeft = i < cardsPerSide;
              const stackIndex = isLeft ? i : i - cardsPerSide;

              const verticalOffset = stackIndex * -0.5;
              const horizontalRandom = (Math.random() - 0.5) * 4;

              const centerRect = new DOMRect(deckRect.left + horizontalRandom, deckRect.top + verticalOffset, deckRect.width, deckRect.height);
              const leftRect = new DOMRect(deckRect.left + leftOffset + horizontalRandom, deckRect.top + verticalOffset, deckRect.width, deckRect.height);
              const rightRect = new DOMRect(deckRect.left + rightOffset + horizontalRandom, deckRect.top + verticalOffset, deckRect.width, deckRect.height);

              if (phase === 'split') {
                  items.push({
                      id: `shuffle-split-${i}`,
                      card: null,
                      startRect: centerRect,
                      endRect: isLeft ? leftRect : rightRect,
                      animationType: 'shuffle-split',
                      delay: stackIndex * 10,
                      zIndex: stackIndex
                  });
              } else {
                  const isLeftFirst = Math.random() > 0.5;
                  const riffleDelay = (stackIndex * 20) + (isLeft === isLeftFirst ? 0 : 10);

                  items.push({
                      id: `shuffle-riffle-${i}`,
                      card: null,
                      startRect: isLeft ? leftRect : rightRect,
                      endRect: centerRect,
                      animationType: 'shuffle-riffle',
                      delay: riffleDelay,
                      zIndex: stackIndex + (isLeft ? 0 : 100)
                  });
              }
          }
          return items;
      };

      for (let i = 0; i < cycles; i++) {
           setShuffleAnimationState(generateItems('split'));
           await new Promise(r => setTimeout(r, 450));

           await new Promise(r => setTimeout(r, 50));

           setShuffleAnimationState(generateItems('riffle'));
           await new Promise(r => setTimeout(r, 550));

           await new Promise(r => setTimeout(r, 150));
      }

      setShuffleAnimationState(null);
      setGameState(prev => ({ ...prev!, deck: shuffleDeck([...prev!.deck]) }));
      setSpecialMessage({ text: "Shuffled!", type: 'event' });
      setDealingStep(1);
  };

  const handleDeckClick = () => {
    if (gameState?.stage !== GameStage.SETUP || dealAnimationState || shuffleAnimationState || dealingStep > 3) return;

    const startRect = deckRef.current?.getBoundingClientRect();
    if (!startRect) {
        return;
    }
    
    if (dealingStep === 0) {
        runShuffleSequence();
        return;
    }

    const playerLSRect = playerLastStandRef.current?.getBoundingClientRect();
    const playerLCRect = playerLastChanceRef.current?.getBoundingClientRect();
    const playerHandRect = playerHandRef.current?.getBoundingClientRect();

    if (!playerLSRect || !playerLCRect || !playerHandRect) {
      return;
    }

    const animations: DealAnimationItem[] = [];
    let delay = 0;
    const delayIncrement = 200;
    const { width: cardWidth, height: cardHeight } = getCardDimensions();
    
    const numPlayers = gameState.players.length;
    let currentDeck = [...gameState.deck];

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
            deck: currentDeck,
            stage: GameStage.SWAP,
            currentPlayerId: -1,
            isPlayerTurn: false,
        };
    };

    setDealingStep(4);
    setDealAnimationState(animations);
    const totalAnimationTime = delay + 400;
    setTimeout(() => {
        setGameState(finalGameStateUpdate);
        setDealAnimationState(null);
        setSpecialMessage({ text: "Change Cards?", type: 'event' });
    }, totalAnimationTime);
  };
  
  const handleSetDifficulty = (newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty);
    resetGame(1);
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

  useEffect(() => {
    if (gameState && gameState.stage === GameStage.PLAY && gameState.players[gameState.currentPlayerId].isAI && !gameState.winner && !animationState && !eatAnimationState && !refillAnimationState && !shuffleAnimationState) {
      const turnTimeout = setTimeout(() => {
        const aiPlayer = gameState.players[gameState.currentPlayerId];
        const targetCard = gameState.mpa.length > 0 ? gameState.mpa[gameState.mpa.length - 1] : undefined;
        
        const play = getAIPlay(aiPlayer, targetCard, gameState.mpa.length, gameState.deck.length, difficulty);

        if (aiPlayer.hand.length === 0 && aiPlayer.lastChance.length === 0) {
            const cardToPlay = play[0];
            const cardIndex = aiPlayer.lastStand.findIndex(c => c.id === cardToPlay.id);

            const startRect = opponentLastStandRef.current?.getBoundingClientRect();
            if (isValidPlay([cardToPlay], targetCard, aiPlayer)) {
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
                setSpecialMessage({ text: `${aiPlayer.name} Busts!`, type: 'event' });
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
                    return { ...prev, mpa: [] };
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
  const topPlayer = aiPlayers[0];

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
            default:
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
    <div className="game-board-bg h-screen flex flex-col justify-between pt-4 box-border relative overflow-hidden">
      
      <div
            className="absolute top-12 left-1/2 -translate-x-1/2 text-white text-sm font-light opacity-25 pointer-events-none select-none"
        >
            created by SalamancaTech
        </div>

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
                <button onClick={() => resetGame(1)} className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors">New Game</button>
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

        {isRulesModalOpen && (
            <GameRulesModal onClose={() => setIsRulesModalOpen(false)} />
        )}

        {isEditNamesModalOpen && (
            <EditNamesModal
            currentNames={playerNames}
            numOpponents={1}
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
                animationType="deal"
                delay={anim.delay}
                zIndex={index}
                isFaceUp={anim.isFaceUp}
                onAnimationEnd={() => {}}
                difficulty={difficulty}
            />
        ))}
        {shuffleAnimationState && shuffleAnimationState.map((anim, index) => (
             <AnimatedCard
                key={anim.id}
                card={{ suit: Suit.Spades, rank: Rank.Two, value: 0, id: anim.id }} // Dummy card data
                startRect={anim.startRect}
                endRect={anim.endRect}
                animationType={anim.animationType}
                delay={anim.delay}
                zIndex={anim.zIndex}
                isFaceUp={false}
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

        {/* Opponent Area */}
        <div className="w-full flex justify-center pointer-events-none z-10">
            {topPlayer && (
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
            )}
        </div>

        {/* Game Board Wrapper */}
        <div className="w-full flex justify-center items-center pointer-events-auto z-0">
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
                isShuffling={!!shuffleAnimationState}
            />
        </div>

        {/* Player's Controls & Area */}
        <div className="w-full flex justify-center pointer-events-none z-20">
            <DroppableArea id="player-hand-drop-zone" className="w-full pointer-events-none">
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

        <DragOverlay dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
            {activeDragId && (
                <div className="opacity-100 scale-110 cursor-grabbing shadow-2xl rounded-lg" style={{ touchAction: 'none', transform: 'rotate(3deg)' }}>
                    {activeDragId === 'mpa-stack' ? (
                       <div className="relative card-size">
                          {gameState.mpa.slice(-3).map((card, index) => (
                             <div key={card.id} className="absolute inset-0" style={{ transform: `translateX(${index * 4}px) translateY(${index * 4}px)`}}>
                                 <Card card={card} isFaceUp={true} difficulty={difficulty}/>
                             </div>
                           ))}
                       </div>
                    ) : (
                        <div className="relative card-size">
                           {activeDragData?.card ? (
                                selectedCards.length > 1 && selectedCards.some(c => c.id === activeDragData.card.id) ? (
                                    // Render stack if dragging multiple
                                    <div className="relative w-full h-full">
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

      {gameState.stage === GameStage.GAME_OVER && gameState.winner && (
          <GameOverModal
            winner={gameState.winner}
            humanPlayer={humanPlayer}
            aiPlayers={aiPlayers}
            turnCount={gameState.turnCount}
            gameDuration={Math.round((Date.now() - gameState.gameStartTime) / 1000)}
            difficulty={difficulty}
            onPlayAgain={() => resetGame(1)}
          />
      )}
    </div>
  );
};

export default App;

import React, { useRef, useState, useEffect } from 'react';
import { Player, Card as CardType, GameStage, Suit, Rank, Difficulty } from '../types';
import Card from './Card';
import { LAYOUT_CONSTANTS } from '../constants';
import { DraggableCard } from './DraggableCard';
import { DroppableArea } from './DroppableArea';

interface PlayerAreaProps {
  player: Player;
  isCurrentPlayer: boolean;
  selectedCards: CardType[];
  onCardSelect: (card: CardType) => void;
  onLastStandCardSelect?: (card: CardType, index: number) => void;
  isPlayer: boolean;
  currentStage: GameStage;
  hiddenCardIds: Set<string>;
  playerHandRef?: React.RefObject<HTMLDivElement>;
  lastStandRef?: React.RefObject<HTMLDivElement>;
  lastChanceRef?: React.RefObject<HTMLDivElement>;
  cardTableRef?: React.RefObject<HTMLDivElement>;
  isInitialPlay?: boolean;
  difficulty: Difficulty;
  activeDragId?: string | null;
  handReorderPreview?: { id: string, newIndex: number } | null;
}

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isCurrentPlayer, selectedCards, onCardSelect, onLastStandCardSelect, isPlayer, currentStage, hiddenCardIds, playerHandRef, lastStandRef, lastChanceRef, cardTableRef, isInitialPlay = false, difficulty, activeDragId, handReorderPreview }) => {
  const handContainerRef = useRef<HTMLDivElement>(null);
  const [handLayout, setHandLayout] = useState({
    cardSpacing: 0,
    totalWidth: 0,
    overlap: 0,
  });

  // This effect calculates how hand cards should be spaced
  useEffect(() => {
    const calculateLayout = () => {
      if (!isPlayer || !handContainerRef.current || player.hand.length <= 0) {
        return;
      }
      
      const container = handContainerRef.current;
      const containerWidth = container.offsetWidth;
      // Fixed constants now
      const cardWidth = window.innerWidth >= 768 ? LAYOUT_CONSTANTS.CARD_WIDTH_MD : LAYOUT_CONSTANTS.CARD_WIDTH_SM;
      const numCards = player.hand.length;
      
      const totalCardsWidthNoOverlap = numCards * cardWidth;

      if (totalCardsWidthNoOverlap <= containerWidth) {
        // Plenty of space, center them with some padding
        const spacing = cardWidth + 16;
        setHandLayout({
            cardSpacing: spacing,
            totalWidth: numCards > 0 ? (numCards -1) * spacing + cardWidth : 0,
            overlap: 0,
        });
      } else {
        // Overlap is needed to fit within container (Black Box concept)
        // Formula: (n-1)*spacing + width = containerWidth
        // spacing = (containerWidth - width) / (n - 1)
        let spacing = (containerWidth - cardWidth) / (numCards - 1);

        setHandLayout({
          cardSpacing: spacing,
          totalWidth: containerWidth,
          overlap: 0, // Handled by spacing logic in render
        });
      }
    };

    const timeoutId = setTimeout(calculateLayout, 0);
    window.addEventListener('resize', calculateLayout);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateLayout);
    };
  }, [isPlayer, player.hand.length]);
  
  const typePrefix = isPlayer ? 'player' : 'opponent';

  // Opponent's Consolidated View
  if (!isPlayer) {
    const handCardCount = player.hand.length;
    // Cap visual cards at 3 for opponent
    const handVisualCount = Math.min(handCardCount, 3);
    const handCards = Array.from({ length: handVisualCount }).map((_, i) => (
        <div
            key={`op-hand-${i}`}
            className="absolute"
            style={{
                left: `${i * 12}px`,
                zIndex: i
            }}
        >
             <Card
                card={{ suit: Suit.Spades, rank: Rank.Two, value: 0, id: `opponent-hand-pile-${i}` }}
                isFaceUp={false}
                className="shadow-md"
                difficulty={difficulty}
            />
        </div>
    ));

    return (
        <div className="flex justify-center items-end w-full max-w-4xl px-4 md:px-8">
            {/* Left Column: Opponent Hand */}
            <div ref={playerHandRef} id={`${typePrefix}-hand-container`} className="relative w-20 h-28 md:w-24 md:h-36 mr-4 md:mr-8 flex-shrink-0">
                <div className="relative w-full h-full">
                    {handCardCount > 0 && handCards}
                    {handCardCount > 0 && (
                        <div className="absolute -top-4 -right-4 bg-yellow-400 text-black font-oswald font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-lg z-20 text-lg">
                            {handCardCount}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Group: Table Cards (LC + LS) */}
            <div ref={cardTableRef} className="flex space-x-2 md:space-x-4">
                 {/* 3 Columns corresponding to LC slots */}
                 {[0, 1, 2].map(i => (
                    <div key={i} id={`${typePrefix}-table-slot-${i}`} className="relative w-20 h-28 md:w-24 md:h-36">
                        {/* Last Stand (Bottom/Behind) */}
                        <div ref={lastStandRef} id={`${typePrefix}-ls-slot-${i}`} className="absolute inset-0 top-1 left-1 md:top-2 md:left-2 z-0">
                             {player.lastStand[i] && (
                                <Card
                                    card={player.lastStand[i]}
                                    isFaceUp={false}
                                    difficulty={difficulty}
                                />
                             )}
                        </div>
                         {/* Last Chance (Top/Front) */}
                        <div ref={lastChanceRef} id={`${typePrefix}-lc-slot-${i}`} className="absolute inset-0 z-10">
                            {player.lastChance[i] && (
                                <Card
                                    card={player.lastChance[i]}
                                    isFaceUp={true}
                                    difficulty={difficulty}
                                />
                            )}
                        </div>
                    </div>
                 ))}
            </div>
        </div>
    );
  }

  // Player's View
  const isInLastStand = isPlayer && isCurrentPlayer && player.hand.length === 0 && player.lastChance.length === 0;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl px-4 md:px-8">
      
      {/* Table Cards Area (LC + LS) */}
      <div className="flex justify-center items-end w-full">
         {/* Ghost Left Column for Alignment (matches Opponent Hand width+margin) */}
         <div className="relative w-20 h-28 md:w-24 md:h-36 mr-4 md:mr-8 flex-shrink-0 opacity-0 pointer-events-none"></div>

         <div ref={cardTableRef} className="flex space-x-2 md:space-x-4 mb-4 md:mb-8 pointer-events-auto">
            {/* 3 Columns corresponding to LC slots */}
            {[0, 1, 2].map(i => (
                <div key={i} id={`${typePrefix}-table-slot-${i}`} className="relative w-20 h-28 md:w-24 md:h-36">
                    {/* Last Stand (Bottom/Behind) */}
                    <div ref={lastStandRef} id={`${typePrefix}-ls-slot-${i}`} className="absolute inset-0 top-1 left-1 md:top-2 md:left-2 z-0">
                            {player.lastStand[i] && (
                            <Card
                                card={player.lastStand[i]}
                                isFaceUp={false}
                                onClick={isInLastStand && onLastStandCardSelect ? () => onLastStandCardSelect(player.lastStand[i], i) : undefined}
                                className={isInLastStand ? 'cursor-pointer hover:scale-105 hover:-translate-y-2 ring-2 ring-yellow-400' : ''}
                                difficulty={difficulty}
                            />
                            )}
                    </div>
                        {/* Last Chance (Top/Front) */}
                    <div ref={lastChanceRef} id={`${typePrefix}-lc-slot-${i}`} className={`absolute inset-0 z-10 ${player.lastChance.length === 0 ? 'pointer-events-none' : ''}`}>
                        {player.lastChance[i] ? (
                            isPlayer && currentStage === GameStage.SWAP ? (
                                <DraggableCard
                                    id={`lc-card-${player.lastChance[i].id}`}
                                    data={{ type: 'lc-card', index: i, card: player.lastChance[i] }}
                                    className="w-full h-full"
                                >
                                    <Card
                                        card={player.lastChance[i]}
                                        isFaceUp={true}
                                        isSelected={isPlayer && selectedCards.some(sc => sc.id === player.lastChance[i].id)}
                                        onClick={isPlayer && currentStage === GameStage.SWAP ? () => onCardSelect(player.lastChance[i]) : undefined}
                                        difficulty={difficulty}
                                    />
                                </DraggableCard>
                            ) : (
                                <Card
                                    card={player.lastChance[i]}
                                    isFaceUp={true}
                                    isSelected={isPlayer && selectedCards.some(sc => sc.id === player.lastChance[i].id)}
                                    onClick={
                                    isPlayer && (
                                        (isCurrentPlayer && currentStage === GameStage.PLAY && player.hand.length === 0)
                                    ) ? () => onCardSelect(player.lastChance[i]) : undefined
                                    }
                                    difficulty={difficulty}
                                />
                            )
                        ) : null}
                    </div>
                    {/* Make the LC slot droppable during SWAP */}
                    {isPlayer && currentStage === GameStage.SWAP && (
                         <DroppableArea
                            id={`lc-slot-${i}`}
                            data={{ type: 'lc-slot', index: i }}
                            className="absolute inset-0 z-20"
                            style={{ pointerEvents: 'none' }} // Ensure it doesn't block clicks? Actually dropping needs pointer events.
                         >
                            {/* Empty div for hit area */}
                            <div className="w-full h-full pointer-events-none" />
                         </DroppableArea>
                    )}
                </div>
            ))}
         </div>
      </div>


      {/* Player Hand - Full Width / Centered "Black Box" */}
      <div ref={playerHandRef} id="player-hand-container" className="flex justify-center items-end min-h-[160px] w-full pointer-events-auto">
        <div className={`w-full relative flex justify-center items-center transition-opacity duration-300 ${player.hand.length === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

            <div ref={handContainerRef} className="w-full max-w-3xl h-[144px] relative">
                {/* Max-w-3xl limits the hand spread to a reasonable width (Black Box) */}
                <div 
                    className="absolute bottom-0 left-0 right-0 h-full flex justify-center"
                >
                    {player.hand.map((card, index) => {
                        const isDisabled = isInitialPlay && (card.rank === Rank.Two || card.rank === Rank.Ten);

                        // Calculate position based on spacing
                        const totalWidth = handLayout.totalWidth;
                        const startX = (handContainerRef.current?.offsetWidth || 0) / 2 - totalWidth / 2;

                        // Visual reordering logic
                        let visualIndex = index;
                        // If we are dragging this card, we hide it (DraggableCard handles opacity).
                        // If we are dragging another card and hovering here, we shift.
                        // However, DraggableCard with manual positioning needs careful update.

                        // Logic:
                        // If I am dragging Card A (index 2)
                        // And I hover over Card B (index 0)
                        // The preview state says: { id: CardA, newIndex: 0 }
                        // So visually:
                        // Index 0 should display Card A (the dragged one)? No, usually we just open a gap.
                        // Or we render the list in the *previewed* order.

                        // Let's create a temporary visual list order.
                        let visualList = [...player.hand];
                        if (handReorderPreview && isPlayer) {
                             const draggedIndex = visualList.findIndex(c => c.id === handReorderPreview.id); // actually activeDragId might be better
                             // We know activeDragId is the ID.
                             if (draggedIndex > -1) {
                                 const [item] = visualList.splice(draggedIndex, 1);
                                 visualList.splice(handReorderPreview.newIndex, 0, item);
                             }
                        }

                        // Find where 'card' is in the visual list
                        const currentVisualIndex = visualList.findIndex(c => c.id === card.id);

                        const leftPos = startX + currentVisualIndex * handLayout.cardSpacing;

                        return (
                            <DraggableCard
                                key={card.id}
                                id={card.id}
                                data={{ type: 'hand-card', index: index, card: card }} // Keep original index in data
                                disabled={!isPlayer || isDisabled || (!isCurrentPlayer && currentStage !== GameStage.SWAP)}
                                className={`absolute bottom-0 transition-all duration-200 ease-out hover:-translate-y-8 hover:z-[100] ${hiddenCardIds.has(card.id) ? 'opacity-0' : 'opacity-100'}`}
                            >
                                <div
                                    style={{
                                        // We apply the positioning here to the inner div, or the DraggableCard style?
                                        // DraggableCard applies style prop to the wrapper.
                                        // Since DraggableCard uses transform for drag, and we use left for layout...
                                        // We should probably set 'left' on the wrapper?
                                        // Wait, DraggableCard wrapper accepts style from useDraggable which includes translate.
                                        // If we set 'left' here, it works with 'translate'.
                                        // BUT: DraggableCard logic I wrote uses `style={transform...}`.
                                        // I should pass the position via style prop or className?
                                        // The wrapper is absolute positioned.
                                        position: 'absolute',
                                        left: `${leftPos}px`,
                                        zIndex: currentVisualIndex,
                                        width: window.innerWidth >= 768 ? LAYOUT_CONSTANTS.CARD_WIDTH_MD : LAYOUT_CONSTANTS.CARD_WIDTH_SM
                                    }}
                                >
                                    <Card
                                        card={card}
                                        isFaceUp={isPlayer}
                                        isSelected={isPlayer && selectedCards.some(sc => sc.id === card.id)}
                                        onClick={isPlayer && (currentStage === GameStage.SWAP || isCurrentPlayer) ? () => onCardSelect(card) : undefined}
                                        isDisabled={isDisabled}
                                        difficulty={difficulty}
                                    />
                                </div>
                            </DraggableCard>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerArea;
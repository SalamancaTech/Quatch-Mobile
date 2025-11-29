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
  position: 'top' | 'bottom' | 'left' | 'right';
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

const PlayerArea: React.FC<PlayerAreaProps> = ({ player, isCurrentPlayer, selectedCards, onCardSelect, onLastStandCardSelect, position, currentStage, hiddenCardIds, playerHandRef, lastStandRef, lastChanceRef, cardTableRef, isInitialPlay = false, difficulty, activeDragId, handReorderPreview }) => {
  const isHuman = position === 'bottom';
  const handContainerRef = useRef<HTMLDivElement>(null);
  const typePrefix = isHuman ? 'player' : `opponent-${player.id}`;
  const [cardMargin, setCardMargin] = useState(0);

  useEffect(() => {
    const calculateLayout = () => {
        if (!handContainerRef.current || player.hand.length <= 1) {
            setCardMargin(0);
            return;
        }

        const containerWidth = handContainerRef.current.offsetWidth;
        // Corresponds to md:w-24 (96px) and w-20 (80px) in Card.tsx
        const cardWidth = window.innerWidth >= 768 ? LAYOUT_CONSTANTS.CARD_WIDTH_MD : LAYOUT_CONSTANTS.CARD_WIDTH_SM;
        const numCards = player.hand.length;

        // Total width of all cards without any overlap
        const totalCardsWidth = numCards * cardWidth;

        // Use 95% of the container width to leave some padding on the sides
        const maxAllowedWidth = containerWidth * 0.95;

        let marginLeft = -(cardWidth * 0.6); // Default nice overlap

        if (totalCardsWidth > maxAllowedWidth) {
            // Cards don't fit. Calculate a tighter overlap.
            marginLeft = ((maxAllowedWidth - cardWidth) / (numCards - 1)) - cardWidth;
        }

        setCardMargin(marginLeft);
    };

    calculateLayout();

    window.addEventListener('resize', calculateLayout);
    return () => window.removeEventListener('resize', calculateLayout);

  }, [player.hand.length]);

  // Opponent's Consolidated View
  if (!isHuman) {
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

    if (position === 'top') {
      return (
          <div className="player-area flex justify-center items-start w-full max-w-4xl px-4 md:px-8 pointer-events-none">
              {/* Opponent Hand (Left of Table) */}
              <div
                  ref={playerHandRef}
                  id={`${typePrefix}-hand-container`}
                  className="mr-2 md:mr-4 flex justify-center items-start"
              >
                  <div className="relative w-20 h-28 md:w-24 md:h-36">
                      {handCardCount > 0 && handCards}
                      {handCardCount > 0 && (
                          <div className="absolute -top-4 -right-4 bg-yellow-400 text-black font-oswald font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-lg z-20 text-lg">
                              {handCardCount}
                          </div>
                      )}
                  </div>
              </div>

              {/* Center Group: Table Cards (LC + LS) aligned with Board */}
              <div ref={cardTableRef} className="relative flex space-x-2 md:space-x-4">
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
    } else {
      // Vertical layout for left/right players
      const isLeft = position === 'left';
      return (
        <div className={`player-area flex flex-col items-center justify-center w-48 h-full p-4 ${isLeft ? 'mr-auto' : 'ml-auto'} pointer-events-none`}>
          {/* Hand Pile */}
          <div
            ref={playerHandRef}
            id={`${typePrefix}-hand-container`}
            className="relative w-20 h-28 md:w-24 md:h-36 mb-8"
          >
              {handCardCount > 0 && handCards}
              {handCardCount > 0 && (
                <div className="absolute -top-4 -right-4 bg-yellow-400 text-black font-oswald font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white shadow-lg z-20 text-lg">
                  {handCardCount}
                </div>
              )}
          </div>
          {/* Table Cards */}
          <div ref={cardTableRef} className="relative flex flex-col space-y-2 md:space-y-4">
            {[0, 1, 2].map(i => (
              <div key={i} id={`${typePrefix}-table-slot-${i}`} className="relative w-20 h-28 md:w-24 md:h-36">
                <div ref={lastStandRef} id={`${typePrefix}-ls-slot-${i}`} className="absolute inset-0 top-1 left-1 md:top-2 md:left-2 z-0">
                  {player.lastStand[i] && (
                    <Card
                      card={player.lastStand[i]}
                      isFaceUp={false}
                      difficulty={difficulty}
                    />
                  )}
                </div>
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
  }

  // Player's View
  const isInLastStand = isHuman && isCurrentPlayer && player.hand.length === 0 && player.lastChance.length === 0;

  return (
    // Use flex-col to have DOM order be Table -> Hand (standard)
    <div className="player-area flex flex-col items-center w-full max-w-4xl px-4 md:px-8">
      
        {/* Table Cards Area (LC + LS) */}
        <div className="flex justify-center items-end w-full pointer-events-none">
           <div ref={cardTableRef} className="flex space-x-2 md:space-x-4 mb-16 md:mb-24 pointer-events-auto">
              {/* 3 Columns corresponding to LC slots */}
              {[0, 1, 2].map(i => (
                  <div key={i} id={`${typePrefix}-table-slot-${i}`} className="relative w-20 h-28 md:w-24 md:h-36">
                      {/* Last Stand (Bottom/Behind) */}
                      <div ref={lastStandRef} id={`${typePrefix}-ls-slot-${i}`} className="absolute inset-0 z-0">
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
                      <div ref={lastChanceRef} id={`${typePrefix}-lc-slot-${i}`} className={`absolute inset-0 top-2 z-10 ${player.lastChance.length === 0 ? 'pointer-events-none' : ''}`}>
                          {player.lastChance[i] ? (
                              isHuman && currentStage === GameStage.SWAP ? (
                                  <DraggableCard
                                      id={`lc-card-${player.lastChance[i].id}`}
                                      data={{ type: 'lc-card', index: i, card: player.lastChance[i] }}
                                      className="w-full h-full"
                                  >
                                      <Card
                                          card={player.lastChance[i]}
                                          isFaceUp={true}
                                          isSelected={isHuman && selectedCards.some(sc => sc.id === player.lastChance[i].id)}
                                          onClick={isHuman && currentStage === GameStage.SWAP ? () => onCardSelect(player.lastChance[i]) : undefined}
                                          difficulty={difficulty}
                                      />
                                  </DraggableCard>
                              ) : (
                                  <Card
                                      card={player.lastChance[i]}
                                      isFaceUp={true}
                                      isSelected={isHuman && selectedCards.some(sc => sc.id === player.lastChance[i].id)}
                                      onClick={
                                      isHuman && (
                                          (isCurrentPlayer && currentStage === GameStage.PLAY && player.hand.length === 0)
                                      ) ? () => onCardSelect(player.lastChance[i]) : undefined
                                      }
                                      difficulty={difficulty}
                                  />
                              )
                          ) : null}
                      </div>
                      {/* Make the LC slot droppable during SWAP */}
                      {isHuman && currentStage === GameStage.SWAP && (
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

        {/* Player Hand Area */}
        <div ref={playerHandRef} id="player-hand-container" className="flex justify-center items-end h-28 md:h-36 w-full pointer-events-auto">
            <div
              ref={handContainerRef}
              className={`relative flex justify-center items-end transition-opacity duration-300 w-full max-w-3xl h-28 md:h-36 ${player.hand.length === 0 ? 'opacity-0' : 'opacity-100'}`}
            >
              {player.hand.map((card, index) => {
                  const isDisabled = isInitialPlay && (card.rank === Rank.Two || card.rank === Rank.Ten);

                  return (
                      <DraggableCard
                          key={card.id}
                          id={card.id}
                          data={{ type: 'hand-card', index: index, card: card }}
                          droppableData={isHuman ? { type: 'hand-card', index: index } : undefined}
                          disabled={!isHuman || isDisabled || (!isCurrentPlayer && currentStage !== GameStage.SWAP)}
                          className={`player-hand-card-wrapper transition-all duration-200 ease-out hover:-translate-y-8 hover:z-[100] ${hiddenCardIds.has(card.id) ? 'opacity-0' : 'opacity-100'}`}
                          style={{
                            zIndex: index,
                            marginLeft: index > 0 ? `${cardMargin}px` : '0px'
                          }}
                      >
                          <Card
                              card={card}
                              isFaceUp={isHuman}
                              isSelected={isHuman && selectedCards.some(sc => sc.id === card.id)}
                              onClick={isHuman && (currentStage === GameStage.SWAP || isCurrentPlayer) ? () => onCardSelect(card) : undefined}
                              isDisabled={isDisabled}
                              difficulty={difficulty}
                          />
                      </DraggableCard>
                  );
              })}
            </div>
        </div>
    </div>
  );
};

export default PlayerArea;

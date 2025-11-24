import React from 'react';
import { Card as CardType, Rank, Suit, GameStage, Difficulty } from '../types';
import Card from './Card';
import { LAYOUT_CONSTANTS } from '../constants';

interface GameBoardProps {
  deckCount: number;
  mpa: CardType[];
  binCount: number;
  onMpaClick: () => void;
  isPlayerTurn: boolean;
  hasSelectedCards: boolean;
  isInvalidPlay: boolean;
  stage: GameStage;
  onDeckClick: () => void;
  mpaRef: React.RefObject<HTMLDivElement>;
  deckRef: React.RefObject<HTMLDivElement>;
  isEating: boolean;
  dealingStep?: number;
  isCheatingEnabled?: boolean;
  onBinClick?: () => void;
  difficulty: Difficulty;
  comboCount: number;
}

const GameBoard: React.FC<GameBoardProps> = ({ deckCount, mpa, binCount, onMpaClick, isPlayerTurn, hasSelectedCards, isInvalidPlay, stage, onDeckClick, mpaRef, deckRef, isEating, dealingStep = 4, isCheatingEnabled = false, onBinClick, difficulty, comboCount }) => {
  let mpaClasses = 'flex flex-col items-center p-2 rounded-lg transform transition-all duration-200';

  if (isInvalidPlay) {
    mpaClasses += ' animate-shake ring-4 ring-red-700 scale-105';
  } else if (isPlayerTurn) {
    mpaClasses += ' cursor-pointer';
    if (hasSelectedCards) {
      mpaClasses += ' ring-4 ring-yellow-400 scale-105';
    } else {
      mpaClasses += ' ring-2 ring-red-500 hover:scale-105';
    }
  }

  const wrapperClasses = "relative w-20 h-28 md:w-24 md:h-36 flex flex-col items-center justify-center";
  const isDeckClickable = stage === GameStage.SETUP && dealingStep <= 3;
  const clickableDeckClasses = isDeckClickable ? "cursor-pointer transition-transform hover:scale-105 ring-4 ring-yellow-400 p-2 rounded-lg" : "";
  
  const getInstructionText = () => {
    if (stage !== GameStage.SETUP) return null;
    switch (dealingStep) {
        case 0: return "Click to Shuffle";
        case 1: return "Deal Last Stand";
        case 2: return "Deal Last Chance";
        case 3: return "Deal Hand";
        default: return null;
    }
  }

  const isBinClickable = isCheatingEnabled && binCount > 0;
  const binRingClass = isBinClickable ? 'ring-2 ring-yellow-400 cursor-pointer hover:scale-105' : '';

  const BinPile = (
    <div id="slot-bin" className={`${wrapperClasses} ${binRingClass}`} onClick={isBinClickable ? onBinClick : undefined}>
        <div className="absolute inset-0">
        {binCount > 0
          ? <Card card={{ suit: Suit.Spades, rank: Rank.Two, value: 0, id: 'bin-card' }} isFaceUp={false} className="opacity-50" difficulty={difficulty} />
          : <Card card={null} difficulty={difficulty} />
        }
        </div>
      {binCount > 0 && <span className="absolute -bottom-6 text-sm font-bold text-white whitespace-nowrap">{binCount} cards</span>}
    </div>
  );

  const MpaPile = (
    <div
      id="slot-mpa"
      ref={mpaRef}
      className={`${wrapperClasses} ${mpaClasses} border-none p-0`} // Reset mpaClasses sizing issues
      onClick={isPlayerTurn ? onMpaClick : undefined}
      aria-label={isPlayerTurn ? (hasSelectedCards ? 'Play selected cards to the pile' : 'Eat the pile') : 'Main Play Area'}
    >
      <div className="absolute -top-8 left-0 right-0 flex justify-center pointer-events-none">
        <div key={comboCount} className={`transition-all duration-300 ${comboCount > 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          {comboCount > 1 && (
            <span
              className="text-3xl font-black text-yellow-300"
              style={{ textShadow: '0 0 5px rgba(0,0,0,0.8), 0 0 10px #fde047' }}
            >
              x{comboCount}
            </span>
          )}
        </div>
      </div>
      <div className={`absolute inset-0 transition-opacity ${isEating ? 'opacity-0' : 'opacity-100'}`}>
        {mpa.slice(-3).map((card, index) => (
          <div key={card.id} className="absolute inset-0" style={{ transform: `translateX(${index * 4}px) translateY(${index * 4}px)`}}>
              <Card card={index === mpa.slice(-3).length - 1 ? card : null} isFaceUp={true} difficulty={difficulty}/>
          </div>
        ))}
        {mpa.length === 0 && <Card card={null} difficulty={difficulty}/>}
      </div>
    </div>
  );

  const DeckPile = (
    <div 
      id="slot-deck"
      ref={deckRef}
      className={`${wrapperClasses} ${isDeckClickable ? clickableDeckClasses : ""}`}
      onClick={isDeckClickable ? onDeckClick : undefined}
    >
      <div className="absolute inset-0">
          {deckCount > 0
            ? <Card card={{ suit: Suit.Spades, rank: Rank.Two, value: 0, id: 'deck-card' }} isFaceUp={false} difficulty={difficulty} />
            : <Card card={null} difficulty={difficulty} />
          }
      </div>
      <span className="absolute -bottom-6 font-bold text-sm h-6 text-white whitespace-nowrap">
        {stage !== GameStage.SETUP && deckCount > 0 ? `${deckCount} left` : ''}
      </span>
    </div>
  );


  return (
    <div className="flex flex-col items-center w-full max-w-4xl px-4 md:px-8">
      {/* Instruction text area - visible only during setup */}
      <div className="h-6 mb-2 font-bold text-yellow-300 text-lg">
          {getInstructionText()}
      </div>

      {/* The row containing board elements aligned to match PlayerArea grid */}
      <div className="flex justify-center items-end w-full">

         {/* Column 1: Bin (Aligns with Hand) */}
         <div className="relative w-20 h-28 md:w-24 md:h-36 mr-4 md:mr-8 flex-shrink-0 flex items-center justify-center">
             {BinPile}
         </div>

         {/* Right Group: MPA & Deck (Aligns with LC cards) */}
         <div className="flex space-x-2 md:space-x-4">
              {/* Slot 1: MPA */}
              <div className="relative w-20 h-28 md:w-24 md:h-36 flex items-center justify-center">
                  {MpaPile}
              </div>

              {/* Slot 2: Deck */}
              <div className="relative w-20 h-28 md:w-24 md:h-36 flex items-center justify-center">
                  {DeckPile}
              </div>

              {/* Slot 3: Empty (LC3) */}
              <div className="relative w-20 h-28 md:w-24 md:h-36 pointer-events-none"></div>
          </div>
      </div>
    </div>
  );
};

export default GameBoard;
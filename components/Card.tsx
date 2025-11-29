import React, { useMemo } from 'react';
import { Card as CardType, Suit, Difficulty } from '../types';

interface CardProps {
  card: CardType | null;
  isFaceUp?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  isDisabled?: boolean;
  difficulty?: Difficulty;
}

const Card: React.FC<CardProps> = ({ card, isFaceUp = false, isSelected = false, onClick, className = '', isDisabled = false, difficulty = 'Medium' }) => {
  if (!card) {
    return <div className={`w-24 h-36 md:w-24 md:h-36 rounded-lg border-2 border-dashed border-blue-300/50 ${className}`} />;
  }
  
  const isTinted = difficulty === 'Hard' || difficulty === 'Extreme';
  const isDamaged = difficulty === 'Medium' || difficulty === 'Extreme';
  const hasEffects = isTinted || isDamaged;

  const cardFaceStyle = isTinted 
    ? "bg-amber-200 border border-amber-900/20 shadow-inner shadow-amber-900/40"
    : "bg-stone-100 border border-gray-300 shadow-inner shadow-black/10";

  const suitColor = isTinted 
    ? (card.suit === Suit.Hearts || card.suit === Suit.Diamonds ? 'text-red-900' : 'text-stone-900')
    : (card.suit === Suit.Hearts || card.suit === Suit.Diamonds ? 'text-red-600' : 'text-black');

  const cardBaseStyle = "relative w-24 h-36 md:w-24 md:h-36 rounded-lg shadow-lg p-2 transition-all duration-200 ease-in-out select-none";
  
  const interactionStyle = isDisabled
    ? 'opacity-50 cursor-not-allowed'
    : `${isSelected ? 'transform -translate-y-4 ring-4 ring-yellow-400' : 'hover:-translate-y-2'} cursor-pointer`;

  const dirtStyle = useMemo(() => {
    if (!card || !hasEffects) return {};
    
    let seed = 0;
    for (let i = 0; i < card.id.length; i++) {
        seed = (seed + card.id.charCodeAt(i) * (i + 1)) % 1000;
    }

    const rand = (min: number, max: number) => {
        seed = (seed * 9301 + 49297) % 233280;
        const rnd = seed / 233280;
        return min + rnd * (max - min);
    };

    const effects = [];

    // 1. Darker smudges
    const numDarkSmudges = Math.floor(rand(0, 3));
    for (let i = 0; i < numDarkSmudges; i++) {
        const x = rand(5, 95);
        const y = rand(5, 95);
        const size = rand(15, 40);
        const opacity = rand(0.04, 0.12);
        const brownR = Math.floor(rand(50, 70));
        const brownG = Math.floor(rand(35, 50));
        const brownB = Math.floor(rand(20, 35));
        effects.push(
            `radial-gradient(circle at ${x}% ${y}%, rgba(${brownR}, ${brownG}, ${brownB}, ${opacity}) 0%, transparent ${size}%)`
        );
    }
    
    // 2. Lighter, faded spots
    const numLightSpots = Math.floor(rand(0, 3));
    for (let i = 0; i < numLightSpots; i++) {
        const x = rand(10, 90);
        const y = rand(10, 90);
        const size = rand(20, 60);
        const opacity = rand(0.03, 0.08);
        effects.push(
            `radial-gradient(circle at ${x}% ${y}%, rgba(255, 255, 240, ${opacity}) 0%, transparent ${size}%)`
        );
    }

    // 5. Subtle overall texture/gradient
    const angle = rand(0, 360);
    const darkOpacity1 = rand(0.02, 0.05);
    const darkOpacity2 = rand(0.05, 0.1);
    effects.push(
        `linear-gradient(${angle}deg, rgba(0,0,0,${darkOpacity1}) 0%, rgba(0,0,0,${darkOpacity2}) 100%)`
    );

    if (isDamaged) {
        // 3. Chipped Corners / Tears
        const numChips = Math.floor(rand(0, 3));
        for (let i = 0; i < numChips; i++) {
            const corner = Math.floor(rand(0, 4));
            let x, y;
            switch (corner) {
                case 0: x = rand(-5, 15); y = rand(-5, 15); break; // top-left
                case 1: x = rand(85, 105); y = rand(-5, 15); break; // top-right
                case 2: x = rand(-5, 15); y = rand(85, 105); break; // bottom-left
                default: x = rand(85, 105); y = rand(85, 105); // bottom-right
            }
            const sizeX = rand(8, 20);
            const sizeY = rand(8, 20);
            const opacity = rand(0.3, 0.6);
            const darkR = Math.floor(rand(10, 20));
            const darkG = Math.floor(rand(5, 15));
            const darkB = Math.floor(rand(0, 10));
            effects.push(
                `radial-gradient(${sizeX}% ${sizeY}% at ${x}% ${y}%, rgba(${darkR}, ${darkG}, ${darkB}, ${opacity}) 0%, transparent 100%)`
            );
        }

        // 4. Prominent Folds/Creases
        const numCreases = Math.floor(rand(0, 2));
        for (let i = 0; i < numCreases; i++) {
            const angle = rand(0, 180);
            const position = rand(15, 85);
            const darkOpacity = rand(0.08, 0.15);
            const lightOpacity = rand(0.1, 0.2);
            const darkWidth = rand(0.2, 0.5);
            const lightWidth = rand(0.2, 0.5);
            
            effects.push(
                `linear-gradient(${angle}deg, transparent ${position - darkWidth}%, rgba(0, 0, 0, ${darkOpacity}) ${position}%, transparent ${position + darkWidth}%)`
            );
            effects.push(
                `linear-gradient(${angle}deg, transparent ${position + darkWidth}%, rgba(255, 255, 255, ${lightOpacity}) ${position + darkWidth + lightWidth}%, transparent ${position + darkWidth + lightWidth * 2}%)`
            );
        }

        // 6. Occasional Folded Corner
        if (rand(0, 100) < 15) { // 15% chance
            const corner = Math.floor(rand(0, 4));
            const foldSize = rand(12, 22); // size as a percentage from the edge
            const transparentStop = 100 - foldSize;
            
            let angle = 0;
            switch (corner) {
                case 0: angle = 45; break;  // Top-left
                case 1: angle = 135; break; // Top-right
                case 2: angle = 225; break; // Bottom-right
                case 3: angle = 315; break; // Bottom-left
            }
            
            // A subtle highlight on the "crease" to give it depth
            effects.push(
                `linear-gradient(${angle}deg, transparent ${transparentStop - 0.8}%, rgba(255, 255, 255, 0.3) ${transparentStop - 0.4}%, transparent ${transparentStop}%)`
            );
            // A dark shadow line for the crease itself, making it the most prominent feature
            effects.push(
                `linear-gradient(${angle}deg, transparent ${transparentStop - 0.4}%, rgba(0, 0, 0, 0.5) ${transparentStop}%, transparent ${transparentStop + 0.4}%)`
            );
            // The main body of the fold, very subtly shadowed to distinguish it from the card face
            effects.push(
                `linear-gradient(${angle}deg, transparent ${transparentStop}%, rgba(0, 0, 0, 0.07) ${transparentStop}%)`
            );
        }
    }
    
    return {
        backgroundImage: effects.join(', '),
    };
  }, [card?.id, hasEffects, isDamaged]);

  if (!isFaceUp) {
    return (
      <div
        id={card.id}
        className={`${cardBaseStyle} overflow-hidden p-0 ${className} border-2 border-yellow-500/30`}
        onClick={onClick}
        style={{
          backgroundImage: "url('/Quatch-Mobile/card_back.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Overlay for dirt and damage effects */}
        <div className="absolute inset-0" style={dirtStyle} />
      </div>
    );
  }

  return (
    <div
      id={card.id}
      className={`${cardBaseStyle} ${cardFaceStyle} ${interactionStyle} ${className}`}
      onClick={isDisabled ? undefined : onClick}
      style={dirtStyle}
    >
      {/* Large center suit */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-6xl md:text-8xl opacity-15 ${suitColor}`}>{card.suit}</span>
      </div>
    
      {/* Top-left rank and suit */}
      <div className={`relative ${suitColor}`}>
          <div className="font-black text-2xl md:text-3xl leading-none">{card.rank}</div>
          <div className="text-xl md:text-2xl leading-none">{card.suit}</div>
      </div>
    </div>
  );
};

export default Card;
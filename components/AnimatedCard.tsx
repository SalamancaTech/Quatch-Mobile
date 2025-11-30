import React from 'react';
import { Card as CardType, Difficulty } from '../types';
import Card from './Card';

interface AnimatedCardProps {
  card: CardType;
  startRect: DOMRect;
  endRect: DOMRect;
  animationType: 'play' | 'eat' | 'deal' | 'shuffle-split' | 'shuffle-riffle';
  onAnimationEnd: () => void;
  delay?: number;
  zIndex: number;
  isFaceUp?: boolean;
  difficulty?: Difficulty;
  startRotation?: number;
  endRotation?: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ card, startRect, endRect, animationType, onAnimationEnd, delay = 0, zIndex, isFaceUp = true, difficulty, startRotation = 0, endRotation = 0 }) => {
  let style: React.CSSProperties;

  const endXBase = endRect.left - startRect.left;
  const endYBase = endRect.top - startRect.top;

  if (animationType === 'play' || animationType === 'deal') {
    const midX = (endXBase / 2);
    const midY = (endYBase / 2) - 80; // A higher arc for more drama
    const endRotation = Math.random() * 12 - 6; // -6 to +6 degrees for a gentle, varied stack

    style = {
      position: 'fixed',
      top: `${startRect.top}px`,
      left: `${startRect.left}px`,
      zIndex: 100 + zIndex,
      '--mid-x': `${midX}px`,
      '--mid-y': `${midY}px`,
      '--end-x': `${endXBase + (Math.random() * 8 - 4)}px`, // Slight random landing spot
      '--end-y': `${endYBase + (Math.random() * 8 - 4)}px`, // Slight random landing spot
      '--end-rot': `${endRotation}deg`,
      '--z-index': zIndex, // For stacking on the pile
      animationDelay: `${delay}ms`,
    } as React.CSSProperties;

  } else if (animationType === 'shuffle-split' || animationType === 'shuffle-riffle') {
    style = {
      position: 'fixed',
      top: `${startRect.top}px`,
      left: `${startRect.left}px`,
      zIndex: 100 + zIndex,
      '--end-x': `${endXBase}px`,
      '--end-y': `${endYBase}px`,
      '--z-index': zIndex,
      '--start-rot': `${startRotation}deg`,
      '--end-rot': `${endRotation}deg`,
      animationDelay: `${delay}ms`,
    } as React.CSSProperties;

  } else { // 'eat'
    const startRotation = Math.random() * 20 - 10;
    const endRotation = (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 180); // Wild spin
    const endXOffset = (Math.random() - 0.5) * endRect.width * 0.7; // Scatter into hand area
    const endYOffset = (Math.random() - 0.5) * endRect.height * 0.4;

    style = {
      position: 'fixed',
      top: `${startRect.top}px`,
      left: `${startRect.left}px`,
      zIndex: 100,
      '--start-rot': `${startRotation}deg`,
      '--end-x': `${endXBase + endXOffset}px`,
      '--end-y': `${endYBase + endYOffset}px`,
      '--end-rot': `${endRotation}deg`,
      animationDelay: `${delay}ms`,
    } as React.CSSProperties;
  }
  
  let animationClass = 'animate-eat-card';
  if (animationType === 'play') animationClass = 'animate-play-card';
  if (animationType === 'deal') animationClass = 'animate-deal-card';
  if (animationType === 'shuffle-split') animationClass = 'animate-shuffle-split';
  if (animationType === 'shuffle-riffle') animationClass = 'animate-shuffle-riffle';

  // Add .card-size to ensure fluid dimensions apply to the animated element
  return (
    <div style={style} onAnimationEnd={onAnimationEnd} className={`${animationClass} card-size`}>
      <Card card={card} isFaceUp={isFaceUp} difficulty={difficulty} />
    </div>
  );
};

export default AnimatedCard;

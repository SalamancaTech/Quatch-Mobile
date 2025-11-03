
import React, { useState, useEffect } from 'react';
import { GameState, Player, Difficulty } from '../types';

interface StatisticsModalProps {
  gameState: GameState;
  humanPlayer: Player;
  aiPlayer: Player;
  difficulty: Difficulty;
  onClose: () => void;
}

const formatDuration = (start: number) => {
    if (!start) return '0:00';
    const secondsElapsed = Math.floor((Date.now() - start) / 1000);
    const mins = Math.floor(secondsElapsed / 60);
    const secs = secondsElapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const StatRow: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <>
        <span className="font-semibold text-gray-300">{label}:</span>
        <span className="text-right">{value}</span>
    </>
);

const StatisticsModal: React.FC<StatisticsModalProps> = ({ gameState, humanPlayer, aiPlayer, difficulty, onClose }) => {
  const [activeTab, setActiveTab] = useState<'current' | 'total'>('current');
  const [time, setTime] = useState(formatDuration(gameState.gameStartTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(formatDuration(gameState.gameStartTime));
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState.gameStartTime]);

  const renderCurrentGameStats = () => (
    <div className="bg-black/30 rounded-lg p-4 text-left">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-md">
        <StatRow label="Difficulty" value={difficulty} />
        <StatRow label="Game Time" value={time} />
        <StatRow label="Turn Count" value={gameState.turnCount} />
        <StatRow label="Deck Cards Left" value={gameState.deck.length} />

        <div className="col-span-2 border-t border-yellow-300/20 my-2"></div>

        <h3 className="col-span-2 font-bold text-lg text-center mb-1">{humanPlayer.name}</h3>
        <StatRow label="Cards Eaten" value={humanPlayer.cardsEaten} />
        <StatRow label="Cards in Hand" value={humanPlayer.hand.length} />
        <StatRow label="Last Chance" value={humanPlayer.lastChance.length} />
        <StatRow label="Last Stand" value={humanPlayer.lastStand.length} />
        
        <div className="col-span-2 border-t border-yellow-300/20 my-2"></div>

        <h3 className="col-span-2 font-bold text-lg text-center mb-1">{aiPlayer.name}</h3>
        <StatRow label="Cards Eaten" value={aiPlayer.cardsEaten} />
        <StatRow label="Cards in Hand" value={aiPlayer.hand.length} />
        <StatRow label="Last Chance" value={aiPlayer.lastChance.length} />
        <StatRow label="Last Stand" value={aiPlayer.lastStand.length} />
      </div>
    </div>
  );

  const renderTotalStats = () => (
    <div className="bg-black/30 rounded-lg p-4 text-center h-48 flex items-center justify-center">
        <p className="text-gray-400 text-lg">
            Lifetime statistics will be available soon!
        </p>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] animate-prompt-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-green-900/95 border-2 border-yellow-500/70 rounded-2xl shadow-2xl p-6 md:p-8 w-11/12 max-w-lg text-white flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-yellow-300">Statistics</h2>
          <button 
            onClick={onClose}
            className="text-4xl font-bold text-white hover:text-yellow-400 transition-colors"
            aria-label="Close statistics"
          >
            &times;
          </button>
        </div>

        <div className="flex-shrink-0 mb-4 border-b-2 border-yellow-500/30">
          <button 
            className={`px-4 py-2 text-lg font-semibold transition-colors ${activeTab === 'current' ? 'text-yellow-300 border-b-2 border-yellow-300' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('current')}
          >
            Current Game
          </button>
          <button 
            className={`px-4 py-2 text-lg font-semibold transition-colors ${activeTab === 'total' ? 'text-yellow-300 border-b-2 border-yellow-300' : 'text-gray-400 hover:text-white'}`}
            onClick={() => setActiveTab('total')}
          >
            Total
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
            {activeTab === 'current' ? renderCurrentGameStats() : renderTotalStats()}
        </div>

        <button 
          onClick={onClose} 
          className="mt-6 flex-shrink-0 px-8 py-3 bg-yellow-500 text-gray-900 font-bold rounded-lg shadow-lg hover:bg-yellow-400 transition-colors transform hover:scale-105 text-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default StatisticsModal;

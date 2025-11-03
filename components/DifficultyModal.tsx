
import React from 'react';
import { Difficulty } from '../types';

interface DifficultyModalProps {
  currentDifficulty: Difficulty;
  onSelect: (difficulty: Difficulty) => void;
  onClose: () => void;
}

const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Extreme'];
const difficultyDescriptions: Record<Difficulty, string> = {
    Easy: 'A relaxed experience. Opponent plays its lowest cards.',
    Medium: 'A balanced challenge. Opponent adapts to pressure.',
    Hard: 'A tough gameplay experience. Opponent plays strategically to win.',
    Extreme: "Unforgiving. Opponent is aggressive and conserves resources. Consider Cheatin'!",
};


const DifficultyModal: React.FC<DifficultyModalProps> = ({ currentDifficulty, onSelect, onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] animate-prompt-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-green-900/95 border-2 border-yellow-500/70 rounded-2xl shadow-2xl p-6 md:p-8 w-11/12 max-w-md text-white text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold text-yellow-300 mb-6">Select Difficulty</h2>
        <div className="flex flex-col space-y-4 text-left">
          {difficulties.map((level) => (
            <button
              key={level}
              onClick={() => onSelect(level)}
              className={`w-full p-4 rounded-lg transition-all duration-200 text-lg font-semibold flex flex-col items-start text-white ${
                currentDifficulty === level
                  ? 'bg-black/40 ring-2 ring-yellow-400'
                  : 'bg-black/30 hover:bg-black/40 hover:ring-2 hover:ring-yellow-400/50'
              }`}
            >
              <div className="flex justify-between w-full items-center">
                <span>{level}</span>
                {currentDifficulty === level && <span className="text-sm font-bold text-yellow-300 opacity-75">[ CURRENT ]</span>}
              </div>
              <p className={`text-lg font-normal mt-1 transition-colors ${currentDifficulty === level ? 'text-gray-300' : 'text-gray-400'}`}>
                {difficultyDescriptions[level]}
              </p>
            </button>
          ))}
        </div>
        <button 
          onClick={onClose} 
          className="mt-8 px-8 py-3 bg-gray-600 text-white font-bold rounded-lg shadow-lg hover:bg-gray-500 transition-colors transform hover:scale-105 text-lg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DifficultyModal;
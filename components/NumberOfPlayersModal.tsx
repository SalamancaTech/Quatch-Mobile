import React from 'react';

interface NumberOfPlayersModalProps {
  onSelect: (numOpponents: number) => void;
  onClose: () => void;
}

const NumberOfPlayersModal: React.FC<NumberOfPlayersModalProps> = ({ onSelect, onClose }) => {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] animate-prompt-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-green-900/95 border-2 border-yellow-500/70 rounded-2xl shadow-2xl p-6 md:p-8 w-11/12 max-w-sm text-white text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold text-yellow-300 mb-6">Select Number of Opponents</h2>
        <div className="flex justify-center space-x-4">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onClick={() => onSelect(num)}
              className="px-8 py-3 bg-yellow-500 text-gray-900 font-bold rounded-lg shadow-lg hover:bg-yellow-400 transition-colors transform hover:scale-105 text-lg"
            >
              {num}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-6">
          Note: Only 2-player mode (1 opponent) is available on screens smaller than 720px wide.
        </p>
      </div>
    </div>
  );
};

export default NumberOfPlayersModal;

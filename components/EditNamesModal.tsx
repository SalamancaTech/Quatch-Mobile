
import React, { useState } from 'react';

interface EditNamesModalProps {
  currentNames: { player1: string; opponent: string };
  onSave: (newNames: { player1: string; opponent: string }) => void;
  onClose: () => void;
}

const EditNamesModal: React.FC<EditNamesModalProps> = ({ currentNames, onSave, onClose }) => {
  const [player1Name, setPlayer1Name] = useState(currentNames.player1);
  const [opponentName, setOpponentName] = useState(currentNames.opponent);

  const handleSaveClick = () => {
    onSave({ player1: player1Name, opponent: opponentName });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] animate-prompt-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-green-900/95 border-2 border-yellow-500/70 rounded-2xl shadow-2xl p-6 md:p-8 w-11/12 max-w-sm text-white text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold text-yellow-300 mb-6">Edit Player Names</h2>
        <div className="flex flex-col space-y-4 text-left">
          <div>
            <label htmlFor="player1Name" className="block text-lg font-semibold text-gray-300 mb-1">Your Name</label>
            <input
              id="player1Name"
              type="text"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              maxLength={20}
              className="w-full p-3 bg-black/40 border border-yellow-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label htmlFor="opponentName" className="block text-lg font-semibold text-gray-300 mb-1">Opponent's Name</label>
            <input
              id="opponentName"
              type="text"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              maxLength={20}
              className="w-full p-3 bg-black/40 border border-yellow-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
        </div>
        <div className="flex justify-center space-x-4 mt-8">
          <button 
            onClick={onClose} 
            className="px-8 py-3 bg-gray-600 text-white font-bold rounded-lg shadow-lg hover:bg-gray-500 transition-colors transform hover:scale-105 text-lg"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveClick} 
            className="px-8 py-3 bg-yellow-500 text-gray-900 font-bold rounded-lg shadow-lg hover:bg-yellow-400 transition-colors transform hover:scale-105 text-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditNamesModal;
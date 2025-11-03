
import React from 'react';

interface GameRulesModalProps {
  onClose: () => void;
}

const GameRulesModal: React.FC<GameRulesModalProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[300] animate-prompt-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-green-900/95 border-2 border-yellow-500/70 rounded-2xl shadow-2xl p-6 md:p-8 w-11/12 max-w-2xl text-white flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-yellow-300">Game Rules</h2>
          <button 
            onClick={onClose}
            className="text-4xl font-bold text-white hover:text-yellow-400 transition-colors"
            aria-label="Close rules"
          >
            &times;
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 text-gray-200 text-lg space-y-4 max-h-[70vh]">
          <div>
            <h3 className="text-xl font-bold text-yellow-400 mb-2">Objective</h3>
            <p>Be the first player to get rid of all your cards from your Hand, your Last Chance, and your Last Stand piles.</p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-yellow-400 mb-2">The Setup</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Each player gets 3 face-down <span className="font-semibold text-white">Last Stand</span> cards.</li>
              <li>Each player gets 3 face-up <span className="font-semibold text-white">Last Chance</span> cards on top.</li>
              <li>Each player is dealt a 3-card <span className="font-semibold text-white">Hand</span>.</li>
              <li>Before play begins, you can swap cards between your Hand and Last Chance piles.</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-yellow-400 mb-2">Gameplay</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>You must play a card (or multiple cards of the same rank) with a value equal to or higher than the top card on the main pile.</li>
              <li>If you cannot make a valid play, you must "eat" the entire pile, adding it to your hand.</li>
              <li>After playing from your hand, if you have fewer than 3 cards, you draw from the deck until you have 3 (until the deck is empty).</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold text-yellow-400 mb-2">Special Cards</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong className="text-white">Two (2):</strong> A <span className="text-blue-400 font-semibold">Reset</span> card. Can be played on anything. The next player can play any card.</li>
              <li><strong className="text-white">Ten (10):</strong> A <span className="text-yellow-300 font-semibold">Clear</span> card. Can be played on anything. Clears the pile and you get another turn.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-bold text-yellow-400 mb-2">Four of a Kind</h3>
            <p>If four cards of the same rank are played consecutively, the pile is cleared, and the player who played the fourth card gets another turn.</p>
          </div>

          <div>
            <h3 className="text-xl font-bold text-yellow-400 mb-2">Winning the Game</h3>
            <ul className="list-disc list-inside space-y-1">
                <li>Once your Hand is empty, you play from your face-up Last Chance cards.</li>
                <li>Once those are gone, you blindly play one face-down Last Stand card per turn.</li>
                <li>If your chosen Last Stand card is not a valid play, you must eat the pile, including the failed card.</li>
            </ul>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="mt-6 flex-shrink-0 px-8 py-3 bg-yellow-500 text-gray-900 font-bold rounded-lg shadow-lg hover:bg-yellow-400 transition-colors transform hover:scale-105 text-lg"
        >
          Got It!
        </button>
      </div>
    </div>
  );
};

export default GameRulesModal;
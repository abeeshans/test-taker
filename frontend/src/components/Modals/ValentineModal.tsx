import React, { useState } from 'react';
import { X, Heart, Lock } from '@phosphor-icons/react';
import { ValentineCard, checkUnlockStatus, getTimeUntilUnlock } from '@/utils/valentine';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface ValentineModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: ValentineCard | null;
}

export default function ValentineModal({ isOpen, onClose, card }: ValentineModalProps) {
  const [swapped, setSwapped] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Reset state when modal opens/closes or card changes
  React.useEffect(() => {
    if (isOpen) {
      setSwapped(false);
      setAccepted(false);
    }
  }, [isOpen, card]);

  if (!isOpen || !card) return null;

  const status = checkUnlockStatus(card.date);
  const isLocked = status === 'locked';
  const timeUntil = getTimeUntilUnlock(card.date);
  
  // Check if it's the Feb 1st card (Day 1) or Feb 2nd (Day 2)
  const isDay1 = card.date === '2026-02-01';
  const isDay2 = card.date === '2026-02-02';

  const handleYesClick = () => {
    setAccepted(true);
    // Fire confetti
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#ec4899', '#f472b6'] // Reds and Pinks
    });
  };

  // Parse date for display
  const dateObj = new Date(card.date + 'T12:00:00'); // Safe mid-day parsing
  const dateDisplay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border-2 border-pink-200 dark:border-pink-900/50"
          >
            {/* Header with Close Button */}
            <div className="absolute top-4 right-4 z-10 w-full flex justify-end px-4 pointer-events-none">
              <button
                onClick={onClose}
                className="pointer-events-auto p-2 rounded-full bg-white/50 dark:bg-black/20 hover:bg-pink-100 dark:hover:bg-pink-900/30 text-pink-600 dark:text-pink-400 transition-colors"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 md:p-12 text-center relative overflow-hidden max-h-[85vh] overflow-y-auto">
               {/* Background Decorative Hearts */}
               <div className="absolute top-[-20px] left-[-20px] text-pink-100 dark:text-pink-900/20 rotate-[-15deg]">
                 <Heart size={100} weight="fill" />
               </div>
               <div className="absolute bottom-[-10px] right-[-10px] text-pink-100 dark:text-pink-900/20 rotate-[15deg]">
                 <Heart size={80} weight="fill" />
               </div>

              {isLocked ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <Lock size={40} className="text-gray-400 dark:text-slate-500" weight="fill" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 dark:text-slate-200 mb-2">
                    Not Yet!
                  </h3>
                  <p className="text-gray-500 dark:text-slate-400 mb-6 max-w-xs mx-auto">
                    This love letter is sealed until <br/>
                    <span className="font-semibold text-pink-600 dark:text-pink-400">12:00 AM GMT (7:00 PM EST) on {dateDisplay}</span>.
                  </p>
                  <div className="px-4 py-2 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 rounded-lg text-sm font-medium">
                    Opens in {timeUntil}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mb-6 text-pink-600 dark:text-pink-400 animate-pulse">
                    <Heart size={32} weight="fill" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 font-serif tracking-wide border-b-2 border-pink-100 dark:border-pink-900/30 pb-2 px-8">
                    {card.title}
                  </h3>

                  {isDay1 && (
                      <div className="relative w-full max-w-sm mx-auto aspect-[4/3] rounded-xl overflow-hidden mb-6 shadow-md border-4 border-white rotate-2 transform hover:rotate-0 transition-transform duration-500">
                          <img 
                            src="/valentine/us.png" 
                            alt="Us together" 
                            className="w-full h-full object-cover object-top"
                          />
                      </div>
                  )}

                  {isDay2 && (
                      <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden mb-6 shadow-md border-4 border-white -rotate-1 transform hover:rotate-0 transition-transform duration-500">
                          <img 
                            src="/valentine/us_elevator.png?v=2" 
                            alt="Us in elevator" 
                            className="w-full h-full object-cover"
                          />
                      </div>
                  )}
                  
                  <div className="prose dark:prose-invert prose-pink max-w-none text-left whitespace-pre-wrap">
                    <p className="text-lg text-gray-700 dark:text-slate-300 leading-relaxed font-sans">
                      {card.message}
                    </p>
                    
                    {accepted && isDay1 && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl text-center border border-pink-200 dark:border-pink-800"
                        >
                            <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-pink-200 dark:border-pink-700 shadow-sm relative">
                              <img 
                                src="/valentine/yay.png" 
                                alt="Yay!" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <h4 className="text-xl font-bold text-pink-600 dark:text-pink-400 mb-1">You chose yes!! 💖</h4>
                            <p className="text-gray-600 dark:text-slate-300">I knew you would 😏 I love you baby and I hope you're excited!!</p>
                        </motion.div>
                    )}
                  </div>
                  
                  {isDay1 && !accepted && (
                      <div className="mt-8 flex justify-center gap-8 min-h-[60px] relative items-center w-full max-w-xs mx-auto">
                          {/* We use specific positioning to allow swapping */}
                          <motion.button
                            layout
                            className="px-8 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-full font-bold shadow-lg transition-colors z-20"
                            onClick={handleYesClick}
                            style={{ 
                                order: swapped ? 2 : 1,
                                width: '120px'
                            }}
                          >
                            Yes
                          </motion.button>
                          
                          <motion.button
                            layout
                            className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full font-bold shadow transition-colors z-10"
                            onMouseEnter={() => setSwapped(!swapped)}
                            style={{ 
                                order: swapped ? 1 : 2,
                                width: '120px'
                            }}
                          >
                            No
                          </motion.button>
                      </div>
                  )}

                  {!isDay1 && (
                      <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700 w-full flex justify-center">
                        <span className="text-sm font-medium text-pink-400 dark:text-pink-500 uppercase tracking-widest">
                        I LOVE YOU ❤️
                        </span>
                      </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

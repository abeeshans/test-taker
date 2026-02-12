import React, { useState } from 'react';
import { X, Heart, Lock } from '@phosphor-icons/react';
import { ValentineCard, checkUnlockStatus, getTimeUntilUnlock } from '@/utils/valentine';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Crossword from '../Crossword';
import ValentinePuzzle from '../Puzzle/ValentinePuzzle';
import ValentineWordle from '../ValentineWordle';

interface ValentineModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: ValentineCard | null;
}

export default function ValentineModal({ isOpen, onClose, card }: ValentineModalProps) {
  const [swapped, setSwapped] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [crosswordSolved, setCrosswordSolved] = useState(false);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [wordleSolved, setWordleSolved] = useState(false);

  // Reset state when modal opens/closes or card changes
  React.useEffect(() => {
    if (isOpen) {
      setSwapped(false);
      setAccepted(false);
      setCrosswordSolved(false);
      setPuzzleSolved(false);
      setWordleSolved(false);
    }
  }, [isOpen, card]);

  if (!isOpen || !card) return null;

  const status = checkUnlockStatus(card.date);
  const isLocked = status === 'locked';
  const timeUntil = getTimeUntilUnlock(card.date);
  
  // Check if it's the Feb 1st card (Day 1) or Feb 2nd (Day 2)
  const isDay1 = card.date === '2026-02-01';
  const isDay2 = card.date === '2026-02-02';
  const isDay3 = card.date === '2026-02-03';
  const isDay4 = card.date === '2026-02-04';
  const isDay5 = card.date === '2026-02-05';
  const isDay6 = card.date === '2026-02-06';
  const isDay7 = card.date === '2026-02-07';
  const isDay8 = card.date === '2026-02-08';
  const isDay9 = card.date === '2026-02-09';
  const isDay10 = card.date === '2026-02-10';
  const isDay11 = card.date === '2026-02-11';
  const isDay12 = card.date === '2026-02-12';


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
            className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border-2 border-pink-200 dark:border-pink-900/50"
          >
            {/* Header with Close Button */}
            <div className="absolute top-4 right-4 z-[200] w-full flex justify-end px-4 pointer-events-none">
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

                  {isDay3 && (
                      <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden mb-6 shadow-md border-4 border-white rotate-1 transform hover:rotate-0 transition-transform duration-500">
                          <img 
                            src="/valentine/feb3.png" 
                            alt="You sleeping" 
                            className="w-full h-full object-cover"
                          />
                      </div>
                  )}

                  {isDay4 && (
                      <div className="relative w-full max-w-sm mx-auto aspect-[4/3] rounded-xl overflow-hidden mb-6 shadow-md border-4 border-white -rotate-1 transform hover:rotate-0 transition-transform duration-500">
                          <img 
                            src="/valentine/feb4.png" 
                            alt="Us cuddling" 
                            className="w-full h-full object-cover"
                          />
                      </div>
                  )}

                  {isDay5 && (
                      <div className="relative w-full max-w-sm mx-auto aspect-[1/1] rounded-xl overflow-hidden mb-6 shadow-md border-4 border-white rotate-1 transform hover:rotate-0 transition-transform duration-500">
                          <img 
                            src="/valentine/feb5.png" 
                            alt="Selfie together" 
                            className="w-full h-full object-cover"
                          />
                      </div>
                  )}

                  {isDay6 && (
                      <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden mb-6 shadow-md border-4 border-white -rotate-1 transform hover:rotate-0 transition-transform duration-500">
                          <img 
                            src="/valentine/feb6.jpg" 
                            alt="Us silly face" 
                            className="w-full h-full object-cover"
                          />
                      </div>
                  )}

                  {isDay8 && (
                      <div className="relative w-full max-w-sm mx-auto aspect-[4/3] rounded-xl overflow-hidden mb-6 shadow-md border-4 border-white rotate-1 transform hover:rotate-0 transition-transform duration-500">
                          <img 
                            src="/valentine/feb8.jpg" 
                            alt="Us together" 
                            className="w-full h-full object-cover"
                          />
                      </div>
                  )}

                  {isDay10 && (
                      <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden mb-6 shadow-md border-4 border-white -rotate-1 transform hover:rotate-0 transition-transform duration-500">
                          <img 
                            src="/valentine/feb10.jpg" 
                            alt="For you" 
                            className="w-full h-full object-cover"
                          />
                      </div>
                  )}

                  {isDay11 && (
                      <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden mb-6 shadow-md border-4 border-white rotate-1 transform hover:rotate-0 transition-transform duration-500">
                          <img 
                            src="/valentine/feb11.jpg" 
                            alt="Us together" 
                            className="w-full h-full object-cover"
                          />
                      </div>
                  )}

                  {isDay12 && (
                    <div className="w-full">
                       <div className="prose dark:prose-invert prose-pink max-w-none text-center whitespace-pre-wrap mb-4">
                            <p className="text-lg text-gray-700 dark:text-slate-300 leading-relaxed font-sans">
                                Hi my love ❤️ To unlock today's message, you'll need to answer this question: <br/>
                                <span className="font-bold text-pink-600 dark:text-pink-400">What is a little part of Preston that I miss?</span> <br/>
                                To get the answer, you can solve the wordle!
                            </p>
                       </div>
                       
                       <ValentineWordle 
                           onComplete={() => {
                               setWordleSolved(true);
                               confetti({
                                   particleCount: 200,
                                   spread: 100,
                                   origin: { y: 0.6 },
                                   colors: ['#ef4444', '#f472b6', '#22c55e'] 
                               });
                           }}
                       />
                    </div>
                  )}

                  {isDay12 && wordleSolved && (
                       <motion.div 
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: 'auto' }}
                         className="w-full mt-12 pt-12 border-t-2 border-pink-100 flex flex-col items-center"
                        >
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-600 mb-6 font-serif">
                                Correct! 🚂
                            </h2>
                          <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden mb-8 shadow-xl border-4 border-white rotate-2 hover:rotate-0 transition-transform duration-500">
                             <img 
                                src="/valentine/feb12.jpg" 
                                alt="Us on the train" 
                                className="w-full h-full object-cover"
                             />
                          </div>
                          
                          <div className="prose dark:prose-invert prose-pink max-w-none text-left whitespace-pre-wrap bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-pink-100">
                             <p className="text-lg text-gray-700 dark:text-slate-300 leading-relaxed font-sans">
                                {card.message}
                             </p>
                          </div>
                      </motion.div>
                  )}

                  {isDay9 && (
                    <div className="w-full mb-8">
                       <div className="prose dark:prose-invert prose-pink max-w-none text-center whitespace-pre-wrap mb-4">
                            <p className="text-lg text-gray-700 dark:text-slate-300 leading-relaxed font-sans">
                                Good morningg my princess!! 👑❤️{"\n\n"}
                                Before you read today’s message, I have a little challenge for you. Channel your inner Judy and solve this puzzle to unlock the message:
                            </p>
                       </div>
                       
                       {/* Reference Image */}
                       <div className="relative w-48 mx-auto aspect-[4/3] rounded-lg overflow-hidden mb-4 shadow-sm border-2 border-white/50 opacity-80 hover:opacity-100 transition-opacity">
                          <img 
                            src="/valentine/feb9.jpg" 
                            alt="Reference" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] py-1 text-center font-mono uppercase tracking-widest">
                              Reference
                          </div>
                       </div>

                        <ValentinePuzzle 
                            imageSrc="/valentine/feb9.jpg"
                            onComplete={() => {
                                setPuzzleSolved(true);
                                confetti({
                                    particleCount: 200,
                                    spread: 100,
                                    origin: { y: 0.6 },
                                    colors: ['#ec4899', '#f472b6', '#fbbf24'] 
                                });
                            }}
                        />
                    </div>
                  )}

                  {isDay7 && (
                    <div className="w-full">
                      <p className="text-lg text-gray-700 dark:text-slate-300 leading-relaxed font-sans mb-6">
                         Good morning my beautiful princess!! I wanted to change things up, so before today's love letter, I want you to answer a question for me: <br/>
                         <span className="font-bold text-pink-600 dark:text-pink-400">"What's my favorite part of the day?"</span> <br/>
                         Solve the crossword to get the answer :)
                      </p>
                      
                      <Crossword onComplete={() => {
                          setCrosswordSolved(true);
                           confetti({
                              particleCount: 200,
                              spread: 100,
                              origin: { y: 0.8 }, // Bottom heavy
                              colors: ['#f472b6', '#fbbf24', '#ffffff'] // Pink, Gold, White
                            });
                      }} />
                    </div>
                  )}

                  {isDay7 && crosswordSolved && (
                       <motion.div 
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: 'auto' }}
                         className="w-full mt-12 pt-12 border-t-2 border-pink-100 flex flex-col items-center"
                        >
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-600 mb-6 font-serif">
                                MORNINGS! 🌤️
                            </h2>
                          <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden mb-8 shadow-xl border-4 border-white rotate-2 hover:rotate-0 transition-transform duration-500">
                             <img 
                                src="/valentine/feb7_reveal.jpg" 
                                alt="Us together" 
                                className="w-full h-full object-cover"
                             />
                          </div>
                          
                          <div className="prose dark:prose-invert prose-pink max-w-none text-left whitespace-pre-wrap bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-pink-100">
                             <p className="text-lg text-gray-700 dark:text-slate-300 leading-relaxed font-sans">
                                {card.message}
                             </p>
                          </div>
                      </motion.div>
                  )}                    
                  {isDay9 && puzzleSolved && (
                       <motion.div 
                         initial={{ opacity: 0, height: 0 }}
                         animate={{ opacity: 1, height: 'auto' }}
                         className="w-full mt-12 pt-12 border-t-2 border-pink-100 flex flex-col items-center"
                        >
                            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-600 mb-6 font-serif">
                                Puzzle Solved! 🧩
                            </h2>
                            
                          <div className="flex flex-col md:flex-row gap-6 mb-8 w-full max-w-2xl mx-auto">
                              <div className="relative flex-1 aspect-[3/4] rounded-xl overflow-hidden shadow-xl border-4 border-white rotate-2 hover:rotate-0 transition-transform duration-500">
                                 <img 
                                   src="/valentine/feb9_couch.jpg" 
                                   alt="Couch memory" 
                                   className="w-full h-full object-cover"
                                 />
                              </div>
                              <div className="relative flex-1 aspect-[3/4] rounded-xl overflow-hidden shadow-xl border-4 border-white -rotate-2 hover:rotate-0 transition-transform duration-500">
                                 <img 
                                   src="/valentine/feb9_bed.jpg" 
                                   alt="Bed memory" 
                                   className="w-full h-full object-cover"
                                 />
                              </div>
                          </div>
                          
                          <div className="prose dark:prose-invert prose-pink max-w-none text-left whitespace-pre-wrap bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-pink-100">
                             <p className="text-lg text-gray-700 dark:text-slate-300 leading-relaxed font-sans">
                                {card.message}
                             </p>
                          </div>
                      </motion.div>
                  )}
                  <div className="prose dark:prose-invert prose-pink max-w-none text-left whitespace-pre-wrap">
                    <p className="text-lg text-gray-700 dark:text-slate-300 leading-relaxed font-sans">
                      {isDay7 || isDay9 || isDay12 ? null : card.message}
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

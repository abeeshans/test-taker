import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { VALID_WORDS } from '@/utils/wordleWords';

interface ValentineWordleProps {
  onComplete: () => void;
}

const SOLUTION = "TRAIN";
const WORD_LENGTH = 5;
const MAX_GUESSES = 4;

export default function ValentineWordle({ onComplete }: ValentineWordleProps) {
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [shakeRow, setShakeRow] = useState<number | null>(null);

  const submitGuess = () => {
      if (currentGuess.length !== WORD_LENGTH) {
          setShakeRow(guesses.length);
          setTimeout(() => setShakeRow(null), 500);
          return;
      }

      // Dictionary Check
      if (!VALID_WORDS.includes(currentGuess) && currentGuess !== SOLUTION) {
          setShakeRow(guesses.length);
          setTimeout(() => setShakeRow(null), 500);
          // Optional: Show toast or message "Not in word list"
          return;
      }

      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);
      setCurrentGuess("");

      if (currentGuess === SOLUTION) {
          setWon(true);
          setGameOver(true);
          setTimeout(onComplete, 1500);
      } else if (newGuesses.length >= MAX_GUESSES) {
          setGameOver(true);
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver) return;

      const key = e.key.toUpperCase();

      if (key === "ENTER") {
        submitGuess();
      } else if (key === "BACKSPACE") {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (/^[A-Z]$/.test(key)) {
        if (currentGuess.length < WORD_LENGTH) {
          setCurrentGuess((prev) => prev + key);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentGuess, guesses, gameOver, onComplete]);

  // Virtual Keyboard
  const handleVirtualKey = (key: string) => {
    if (gameOver) return;
    
    if (key === "ENTER") {
       submitGuess();
    } else if (key === "BACKSP") {
        setCurrentGuess((prev) => prev.slice(0, -1));
    } else {
        if (currentGuess.length < WORD_LENGTH) {
          setCurrentGuess((prev) => prev + key);
        }
    }
  };


  const getLetterStatus = (letter: string, index: number, word: string) => {
    if (word[index] === letter) return "correct";
    if (SOLUTION.includes(letter)) return "present";
    return "absent";
  };
  
  // Helper to get key status for virtual keyboard
  const getKeyStatus = (key: string) => {
      let status = 'neutral';
      
      for (const guess of guesses) {
          for (let i = 0; i < guess.length; i++) {
              const letter = guess[i];
              if (letter === key) {
                  if (SOLUTION[i] === key) return 'correct';
                  if (SOLUTION.includes(key) && status !== 'correct') status = 'present';
                  if (!SOLUTION.includes(key) && status === 'neutral') status = 'absent';
              }
          }
      }
      return status;
  };

  const rows = [...guesses];
  if (guesses.length < MAX_GUESSES) {
    rows.push(currentGuess);
  }
  while (rows.length < MAX_GUESSES) {
    rows.push("");
  }

  const resetGame = () => {
      setGuesses([]);
      setCurrentGuess("");
      setGameOver(false);
      setWon(false);
  };

  const handleReveal = () => {
      setGuesses([...guesses, SOLUTION]); // Show solution
      setWon(true);
      setGameOver(true);
      setTimeout(onComplete, 1000);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto p-4">
      <div className="grid grid-rows-4 gap-2 mb-6">
        {rows.map((word, rowIndex) => (
          <motion.div
            key={rowIndex}
            animate={shakeRow === rowIndex ? { x: [-10, 10, -10, 10, 0] } : {}}
            className="grid grid-cols-5 gap-2"
          >
            {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
              const letter = word[colIndex] || "";
              const isCompletedRow = rowIndex < guesses.length;
              let status = "neutral";
              
              if (isCompletedRow) {
                  if (SOLUTION[colIndex] === letter) status = "correct";
                  else if (SOLUTION.includes(letter)) status = "present";
                  else status = "absent";
              }

              return (
                <motion.div
                  key={colIndex}
                  initial={isCompletedRow ? { rotateX: -90 } : {}}
                  animate={isCompletedRow ? { rotateX: 0 } : {}}
                  transition={{ delay: colIndex * 0.1 }}
                  className={`w-10 h-10 sm:w-12 sm:h-12 border-2 flex items-center justify-center text-xl font-bold uppercase rounded
                    ${
                      status === "correct"
                        ? "bg-green-500 border-green-500 text-white"
                        : status === "present"
                        ? "bg-yellow-500 border-yellow-500 text-white"
                        : status === "absent"
                        ? "bg-gray-500 border-gray-500 text-white"
                        : "border-gray-300 dark:border-slate-600 text-gray-800 dark:text-gray-200"
                    }`}
                >
                  {letter}
                </motion.div>
              );
            })}
          </motion.div>
        ))}
      </div>

      {/* Virtual Keyboard */}
      <div className="w-full flex flex-col gap-2 mb-4">
          {['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((row, i) => (
              <div key={i} className="flex justify-center gap-1">
                  {i === 2 && (
                      <button onClick={() => handleVirtualKey('ENTER')} className="px-2 py-3 rounded bg-gray-200 dark:bg-slate-700 text-xs font-bold hover:bg-gray-300">ENT</button>
                  )}
                  {row.split('').map(key => {
                      const status = getKeyStatus(key);
                      let bgClass = "bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600";
                      if (status === 'correct') bgClass = "bg-green-500 text-white";
                      else if (status === 'present') bgClass = "bg-yellow-500 text-white";
                      else if (status === 'absent') bgClass = "bg-gray-500 text-white opacity-50";

                      return (
                          <button 
                            key={key} 
                            onClick={() => handleVirtualKey(key)}
                            className={`w-7 h-10 sm:w-8 sm:h-12 rounded flex items-center justify-center text-sm font-bold transition-colors ${bgClass}`}
                          >
                              {key}
                          </button>
                      );
                  })}
                  {i === 2 && (
                      <button onClick={() => handleVirtualKey('BACKSP')} className="px-2 py-3 rounded bg-gray-200 dark:bg-slate-700 text-xs font-bold hover:bg-gray-300">Del</button>
                  )}
              </div>
          ))}
      </div>

      {/* Controls */}
      <div className="w-full flex flex-col items-center gap-2 mt-2">
         {gameOver && !won && (
            <div className="p-4 bg-red-100 text-red-800 rounded-lg text-center w-full">
                <p className="mb-2 font-bold">Unlucky! Try again?</p>
                <div className="flex justify-center gap-2">
                    <button 
                        onClick={resetGame}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors"
                    >
                        Reset Game
                    </button>
                    <button 
                         onClick={handleReveal}
                         className="px-4 py-2 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition-colors"
                    >
                        Reveal
                    </button>
                </div>
            </div>
          )}
          
          {!gameOver && guesses.length >= 2 && (
              <button 
                   onClick={handleReveal}
                   className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                  I give up, show me the answer
              </button>
          )}
      </div>
    </div>
  );
}

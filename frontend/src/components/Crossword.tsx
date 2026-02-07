import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicWand, Lightbulb, CheckCircle, Trash } from '@phosphor-icons/react';

type Direction = 'across' | 'down';

interface Clue {
  id: number;
  direction: Direction;
  text: string;
  answer: string;
  row: number;
  col: number;
  clueIds?: number[];
}

interface CellData {
  char: string;
  row: number;
  col: number;
  clueIds: number[]; // IDs of clues this cell belongs to
  userValue: string;
  isCorrect: boolean;
  isRevealed: boolean;
}

const CLUES: Clue[] = [
  // Across
  { id: 2, direction: 'across', text: "Your mario kart character", answer: "TOAD", row: 0, col: 13 },
  { id: 4, direction: 'across', text: "Two of these makes the best appetizer ever", answer: "PIANO", row: 2, col: 11 },
  { id: 5, direction: 'across', text: "Our go-to eatery", answer: "MISSION", row: 3, col: 0 },
  { id: 7, direction: 'across', text: "Our favorite beach", answer: "SUGARBEACH", row: 5, col: 6 },
  { id: 9, direction: 'across', text: "Aside from being all over Shubha's birthday party, they also made the best cookies", answer: "DISCO", row: 7, col: 13 },
  { id: 10, direction: 'across', text: "Vacation spot once we're rich", answer: "AMALFI", row: 10, col: 16 },
  { id: 12, direction: 'across', text: "The best photo booth in Toronto", answer: "DRAKE", row: 13, col: 16 },
  { id: 13, direction: 'across', text: "My first nickname for you", answer: "WIFEY", row: 15, col: 17 },
  { id: 16, direction: 'across', text: "Something of mine that you hate", answer: "DRIVING", row: 17, col: 20 },

  // Down
  { id: 1, direction: 'down', text: "Our second date", answer: "TENNIS", row: 0, col: 6 },
  { id: 2, direction: 'down', text: "The asian country on our bucket list", answer: "THAILAND", row: 0, col: 13 },
  { id: 3, direction: 'down', text: "Our yearly tradition", answer: "MONOGRAPHY", row: 1, col: 8 },
  { id: 6, direction: 'down', text: "Our favorite place to sit when you're back home", answer: "TREE", row: 4, col: 10 },
  { id: 8, direction: 'down', text: "The best month of the year", answer: "NOVEMBER", row: 6, col: 17 },
  { id: 11, direction: 'down', text: "My favorite place to kiss you", answer: "FOREHEAD", row: 10, col: 20 },
  { id: 14, direction: 'down', text: "What I could use right now", answer: "KISS", row: 16, col: 22 },
  { id: 15, direction: 'down', text: "My favorite way to draw you", answer: "BIRD", row: 16, col: 24 },
];

const REVEAL_WORD = "MORNINGS";
// Manually mapped coordinates for MORNINGS
const REVEAL_COORDS = [
  { r: 6, c: 17 }, // N (NOVEMBER)
  { r: 3, c: 0 }, // M (MISSION)
  { r: 5, c: 6 }, // S (SUGARBEACH)
  { r: 3, c: 4 }, // I (MISSION)
  { r: 6, c: 8 }, // R (MONOGRAPHY)
  { r: 17, c: 26 }, // G (DRIVING)
  { r: 2, c: 15 }, // O (PIANO)
  { r: 3, c: 6 }, // N (TENNIS)
];

export default function Crossword({ onComplete }: { onComplete: () => void }) {
  const [grid, setGrid] = useState<CellData[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number, c: number } | null>(null);
  const [direction, setDirection] = useState<Direction>('across');
  const [activeClueId, setActiveClueId] = useState<number | null>(null);
  const [finalAnswer, setFinalAnswer] = useState(Array(8).fill(''));
  const [isCrosswordComplete, setIsCrosswordComplete] = useState(false);
  const [isFinalSolved, setIsFinalSolved] = useState(false);
  
  const finalInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [foundRevealChars, setFoundRevealChars] = useState<string[]>([]);

  // Initialize Grid
  useEffect(() => {
    const rows = 20;
    const cols = 28;
    const newGrid: CellData[][] = Array(rows).fill(null).map((_, r) => 
      Array(cols).fill(null).map((_, c) => ({
        char: '',
        row: r,
        col: c,
        clueIds: [],
        userValue: '',
        isCorrect: false,
        isRevealed: false
      }))
    );

    CLUES.forEach(clue => {
      const chars = clue.answer.split('');
      chars.forEach((char, i) => {
        const r = clue.direction === 'across' ? clue.row : clue.row + i;
        const c = clue.direction === 'across' ? clue.col + i : clue.col;
        if (newGrid[r] && newGrid[r][c]) {
            newGrid[r][c].char = char;
            newGrid[r][c].clueIds.push(clue.id);
        }
      });
    });

    setGrid(newGrid);
  }, []);

  // Update Found Letters
  useEffect(() => {
    if (grid.length === 0) return;
    
    // Check all reveal coords
    const found: string[] = [];
    REVEAL_COORDS.forEach(rc => {
        const cell = grid[rc.r][rc.c];
        if (cell.userValue === cell.char) {
             found.push(cell.char);
        }
    });
    setFoundRevealChars(found);
  }, [grid]);

  // Update Active Clue based on selection
  useEffect(() => {
    if (!selectedCell || grid.length === 0) {
      setActiveClueId(null);
      return;
    }
    
    const cell = grid[selectedCell.r][selectedCell.c];
    if (!cell || !cell.char) return;

    // Find clue that matches current direction
    const matchingClue = CLUES.find(c => 
      c.clueIds?.includes(activeClueId || -1) ? c.id === activeClueId : // keep same if valid
      c.direction === direction && 
      (direction === 'across' ? 
        c.row === selectedCell.r && c.col <= selectedCell.c && c.col + c.answer.length > selectedCell.c :
        c.col === selectedCell.c && c.row <= selectedCell.r && c.row + c.answer.length > selectedCell.r
      )
    );

    // Fallback search logic
    let foundClue = CLUES.find(c => c.direction === direction && isCellInClue(c, selectedCell.r, selectedCell.c));
    
    if (!foundClue) {
       // Try other direction
       foundClue = CLUES.find(c => c.direction !== direction && isCellInClue(c, selectedCell.r, selectedCell.c));
       if (foundClue) setDirection(foundClue.direction);
    }

    if (foundClue) setActiveClueId(foundClue.id);

  }, [selectedCell, direction, grid]);

  const isCellInClue = (clue: Clue, r: number, c: number) => {
    if (clue.direction === 'across') {
      return r === clue.row && c >= clue.col && c < clue.col + clue.answer.length;
    } else {
      return c === clue.col && r >= clue.row && r < clue.row + clue.answer.length;
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (!grid[r][c].char) return;

    if (selectedCell?.r === r && selectedCell?.c === c) {
      setDirection(prev => prev === 'across' ? 'down' : 'across');
    } else {
      setSelectedCell({ r, c });
    }
    
    // Attempt to focus
    const el = document.getElementById(`cell-${r}-${c}`);
    if (el) el.focus();
  };
  
  const handleClueClick = (clue: Clue) => {
      setDirection(clue.direction);
      setSelectedCell({ r: clue.row, c: clue.col });
      setActiveClueId(clue.id);
      const el = document.getElementById(`cell-${clue.row}-${clue.col}`);
      if (el) el.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    if (isFinalSolved) return;

    // Prevent default scrolling for arrows
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === 'Backspace') {
      const newGrid = [...grid];
      if (newGrid[r][c].userValue === '') {
        // Move back
         moveFocus(r, c, -1);
      } else {
        newGrid[r][c].userValue = '';
        setGrid(newGrid);
      }
    } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
      const newGrid = [...grid];
      newGrid[r][c].userValue = e.key.toUpperCase();
      setGrid(newGrid);
      moveFocus(r, c, 1);
    } else if (e.key === 'ArrowRight') {
      moveFocusGeneric(r, c, 0, 1);
    } else if (e.key === 'ArrowLeft') {
      moveFocusGeneric(r, c, 0, -1);
    } else if (e.key === 'ArrowUp') {
      moveFocusGeneric(r, c, -1, 0);
    } else if (e.key === 'ArrowDown') {
      moveFocusGeneric(r, c, 1, 0);
    } else if (e.key === 'Tab') {
        e.preventDefault();
        // Cycle clues? For now maybe just next clue
    }
  };

  const moveFocus = (r: number, c: number, step: number) => {
    let currR = r;
    let currC = c;
    
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;

    let steps = 0;
    while (steps < 50) { 
        currR += dr * step;
        currC += dc * step;
        steps++;

        if (grid[currR] && grid[currR][currC] && grid[currR][currC].char) {
            setSelectedCell({ r: currR, c: currC });
             const el = document.getElementById(`cell-${currR}-${currC}`);
             if (el) el.focus();
            break;
        }
        
        if (currR < 0 || currR >= 20 || currC < 0 || currC >= 28) break;
    }
  };

   const moveFocusGeneric = (r: number, c: number, dr: number, dc: number) => {
        let currR = r + dr;
        let currC = c + dc;
        if (grid[currR] && grid[currR][currC] && grid[currR][currC].char) {
             setSelectedCell({ r: currR, c: currC });
             const el = document.getElementById(`cell-${currR}-${currC}`);
             if (el) el.focus();
        }
   };

   // Final Puzzle Logic
   const handleFinalInput = (index: number, value: string) => {
     if (!value.match(/[a-zA-Z]/) && value !== '') return;
     
     const newAnswer = [...finalAnswer];
     newAnswer[index] = value.toUpperCase();
     setFinalAnswer(newAnswer);
     
     if (value && index < 7) {
         finalInputRefs.current[index + 1]?.focus();
     }
     
     if (newAnswer.join('') === REVEAL_WORD) {
         setIsFinalSolved(true);
         onComplete();
     }
   };
   
   const handleFinalKeyDown = (e: React.KeyboardEvent, index: number) => {
       if (e.key === 'Backspace' && !finalAnswer[index] && index > 0) {
           finalInputRefs.current[index - 1]?.focus();
       }
   };

   const handleRevealSquare = () => {
       if (!selectedCell) return;
       const { r, c } = selectedCell;
       const cell = grid[r][c];
       if (!cell.char) return;

       const newGrid = [...grid];
       newGrid[r][c].userValue = cell.char;
       setGrid(newGrid);
   };

   const handleRevealCrossword = () => {
       const newGrid = grid.map(row => row.map(cell => ({
           ...cell,
           userValue: cell.char
       })));
       setGrid(newGrid);
   };
   
   const handleClearCrossword = () => {
       const newGrid = grid.map(row => row.map(cell => ({
           ...cell,
           userValue: ''
       })));
       setGrid(newGrid);
   };
   
   const handleUnscramble = () => {
       setFinalAnswer(REVEAL_WORD.split(''));
       setIsFinalSolved(true);
       onComplete();
   };

  if (grid.length === 0) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-8 w-full h-full items-center">
      
      {/* Toolbar */}
      <div className="flex flex-wrap justify-center gap-4 w-full max-w-2xl">
          <button
            onClick={handleRevealSquare}
            disabled={!selectedCell}
            className="flex items-center gap-2 px-4 py-2 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
             <MagicWand size={18} />
             Reveal Square
          </button>
          
          <button
            onClick={handleRevealCrossword}
            className="flex items-center gap-2 px-4 py-2 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg text-sm font-semibold transition-colors"
          >
             <Lightbulb size={18} />
             Reveal Crossword
          </button>

          <button
            onClick={handleClearCrossword}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold transition-colors"
          >
             <Trash size={18} />
             Clear
          </button>
      </div>

      {/* Grid Container */}
      <div className="relative overflow-auto max-h-[60vh] w-full flex justify-center p-4 border border-pink-200 rounded-xl bg-pink-50/30 shadow-inner">
        <div className="relative min-w-[840px] h-[600px] mx-auto select-none">
           {grid.map((row, r) => 
             row.map((cell, c) => {
               if (!cell.char) return null;
               
               // Clue logic
               const startClueIds = CLUES.filter(cl => cl.row === r && cl.col === c).map(cl => cl.id);
               const isStart = startClueIds.length > 0;
               const displayNum = isStart ? Math.min(...startClueIds) : null;
               
               // Highlighting Logic
               const isSelected = selectedCell?.r === r && selectedCell?.c === c;
               const isRevealCell = REVEAL_COORDS.some(rc => rc.r === r && rc.c === c);
               
               // Highlight Active Word - STRICTLY enforce direction
               const isActiveWord = activeClueId && CLUES.find(cl => 
                   cl.id === activeClueId && 
                   cl.direction === direction && // Added strict direction check
                   isCellInClue(cl, r, c)
               );
               
               const isError = cell.userValue && cell.userValue !== cell.char; 

               return (
                 <div 
                   key={`${r}-${c}`}
                   className="absolute flex items-center justify-center p-0.5"
                   style={{ 
                     top: r * 30, 
                     left: c * 30, 
                     width: 30, 
                     height: 30 
                   }}
                 >
                   <motion.div
                     initial={false}
                     animate={{
                        scale: isSelected ? 1.15 : 1,
                        // Reveal cells get special styling: Green background if not selected
                        backgroundColor: isSelected ? '#fef08a' : (isRevealCell ? '#dcfce7' : (isActiveWord ? '#eff6ff' : '#ffffff')),
                        // Reveal cells get thicker border
                        borderColor: isError ? '#ef4444' : (isSelected ? '#eab308' : (isRevealCell ? '#22c55e' : (isActiveWord ? '#93c5fd' : '#1f2937'))),
                        borderWidth: isError ? '2px' : (isRevealCell ? '2px' : '1px')
                     }}
                     className={`w-full h-full border text-center flex items-center justify-center text-xs font-bold relative cursor-pointer
                        shadow-sm transition-colors duration-100
                     `}
                     onClick={() => handleCellClick(r, c)}
                   >
                     {displayNum && (
                       <span className="absolute top-[1px] left-[1px] text-[7px] leading-none text-slate-500 font-mono">
                         {displayNum}
                       </span>
                     )}
                     <input
                        id={`cell-${r}-${c}`}
                        type="text"
                        maxLength={1}
                        value={cell.userValue}
                        onKeyDown={(e) => handleKeyDown(e, r, c)}
                        onChange={() => {}} 
                        className={`w-full h-full bg-transparent text-center outline-none cursor-pointer uppercase font-mono text-base pt-1 ${isError ? 'text-red-500' : 'text-slate-900'}`}
                        autoComplete="off"
                     />
                   </motion.div>
                 </div>
               );
             })
           )}
        </div>
      </div>

      {/* Clues Container */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 text-left bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-pink-100 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-pink-600 mb-3 pb-2 border-b-2 border-pink-200 uppercase tracking-widest text-sm flex items-center gap-2">
                Across 
                <span className="text-xs font-normal text-pink-400 normal-case">(Click to select)</span>
            </h3>
            <div className="space-y-1">
              {CLUES.filter(c => c.direction === 'across').map(clue => (
                <div 
                    key={clue.id} 
                    className={`text-sm py-1.5 px-2 rounded cursor-pointer transition-colors flex ${activeClueId === clue.id && direction === 'across' ? 'bg-pink-100 text-pink-900 font-medium' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-600 dark:text-slate-400'}`}
                    onClick={() => handleClueClick(clue)}
                >
                  <span className="font-bold mr-3 w-4">{clue.id}.</span>
                  <span>{clue.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-pink-600 mb-3 pb-2 border-b-2 border-pink-200 uppercase tracking-widest text-sm flex items-center gap-2">
                Down
                <span className="text-xs font-normal text-pink-400 normal-case">(Click to select)</span>
            </h3>
            <div className="space-y-1">
              {CLUES.filter(c => c.direction === 'down').map(clue => (
                <div 
                    key={clue.id} 
                    className={`text-sm py-1.5 px-2 rounded cursor-pointer transition-colors flex ${activeClueId === clue.id && direction === 'down' ? 'bg-pink-100 text-pink-900 font-medium' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50 text-gray-600 dark:text-slate-400'}`}
                    onClick={() => handleClueClick(clue)}
                >
                  <span className="font-bold mr-3 w-4">{clue.id}.</span>
                  <span>{clue.text}</span>
                </div>
              ))}
            </div>
          </div>
      </div>

       {/* Final Puzzle Section */}
       <div className="w-full max-w-lg mx-auto mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-200 dark:border-yellow-700/30 rounded-2xl text-center">
            <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-4 font-serif">
                Final Answer
            </h3>
            
            <button
               onClick={handleUnscramble}
               className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg text-xs font-semibold transition-colors"
             >
                <CheckCircle size={16} />
                Reveal answer
             </button>
            
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4 max-w-sm mx-auto">
                Unscramble the letters from the <span className="bg-green-100 dark:bg-green-900/40 border border-green-400 px-1 rounded font-bold mx-1">green highlighted cells</span> to find the answer!
            </p>

            {/* Found Letters Pool */}
             <div className="mb-6 bg-white/50 p-3 rounded-lg border border-yellow-100 min-h-[50px]">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Letters Found:</p>
                <div className="flex justify-center gap-2 flex-wrap">
                    {foundRevealChars.length === 0 ? (
                        <span className="text-sm text-slate-400 italic">No secret letters found yet...</span>
                    ) : (
                        foundRevealChars.map((char, i) => (
                           <motion.span 
                             key={i}
                             initial={{ scale: 0, rotate: -20 }}
                             animate={{ scale: 1, rotate: 0 }}
                             className="w-8 h-8 flex items-center justify-center bg-green-100 border border-green-300 rounded font-bold text-green-700 shadow-sm"
                           >
                              {char}
                           </motion.span>
                        ))
                    )}
                </div>
             </div>
            
            <div className="flex justify-center gap-2 sm:gap-4 mb-4">
                {finalAnswer.map((char, i) => (
                    <motion.input
                        key={i}
                        ref={(el: HTMLInputElement | null) => { finalInputRefs.current[i] = el; }}
                        type="text"
                        maxLength={1}
                        value={char}
                        onChange={(e) => handleFinalInput(i, e.target.value)}
                        onKeyDown={(e) => handleFinalKeyDown(e, i)}
                        disabled={isFinalSolved}
                        animate={{
                            scale: isFinalSolved ? [1, 1.2, 1] : 1,
                            borderColor: isFinalSolved ? '#22c55e' : '#fde047'
                        }}
                        className={`w-10 h-12 sm:w-12 sm:h-14 border-2 rounded-lg text-center text-xl sm:text-2xl font-bold uppercase shadow-sm focus:outline-none focus:ring-4 focus:ring-yellow-400/30 transition-all
                            ${isFinalSolved 
                                ? 'bg-green-100 border-green-500 text-green-700' 
                                : 'bg-white border-yellow-400 text-slate-800 focus:border-yellow-500'}
                        `}
                    />
                ))}
            </div>
            
            <AnimatePresence>
                {isFinalSolved && (
                     <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-green-600 font-bold mt-2"
                     >
                         Wait for it... 💕
                     </motion.div>
                )}
            </AnimatePresence>
       </div>
    </div>
  );
}

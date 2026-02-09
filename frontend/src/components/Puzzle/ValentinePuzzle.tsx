import React, { useState, useEffect, useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';

interface PuzzlePiece {
  id: number;
  currentX: number;
  currentY: number;
  correctX: number;
  correctY: number;
  isPlaced: boolean;
  shape: {
    top: number; // 0=flat, 1=tab, -1=slot
    right: number;
    bottom: number;
    left: number;
  };
}

interface ValentinePuzzleProps {
  imageSrc: string;
  onComplete: () => void;
}

const ROWS = 5;
const COLS = 5;

const getPiecePath = (width: number, height: number, shape: PuzzlePiece['shape'], offset: number) => {
  const tabSize = Math.min(width, height) * 0.25; 
  
  const startX = offset;
  const startY = offset;
  
  let d = `M ${startX} ${startY}`;

  // TOP EDGE
  if (shape.top === 0) {
    d += ` L ${startX + width} ${startY}`;
  } else {
    const sign = shape.top * -1; 
    const c1x = startX + width/2 - tabSize/2;
    const c1y = startY;
    const c2x = startX + width/2 - tabSize/2;
    const c2y = startY + sign * tabSize;
    const c3x = startX + width/2 + tabSize/2;
    const c3y = startY + sign * tabSize;
    const c4x = startX + width/2 + tabSize/2;
    const c4y = startY;
    d += ` L ${c1x} ${c1y} C ${c2x} ${c2y}, ${c3x} ${c3y}, ${c4x} ${c4y}`; 
    d += ` L ${startX + width} ${startY}`;
  }

  // RIGHT EDGE
  if (shape.right === 0) {
    d += ` L ${startX + width} ${startY + height}`;
  } else {
    const sign = shape.right; 
    const c1x = startX + width;
    const c1y = startY + height/2 - tabSize/2;
    const c2x = startX + width + sign * tabSize;
    const c2y = startY + height/2 - tabSize/2;
    const c3x = startX + width + sign * tabSize;
    const c3y = startY + height/2 + tabSize/2;
    const c4x = startX + width;
    const c4y = startY + height/2 + tabSize/2;
    d += ` L ${c1x} ${c1y} C ${c2x} ${c2y}, ${c3x} ${c3y}, ${c4x} ${c4y}`;
    d += ` L ${startX + width} ${startY + height}`;
  }

  // BOTTOM EDGE
  if (shape.bottom === 0) {
    d += ` L ${startX} ${startY + height}`;
  } else {
    const sign = shape.bottom; 
    const c1x = startX + width/2 + tabSize/2;
    const c1y = startY + height;
    const c2x = startX + width/2 + tabSize/2;
    const c2y = startY + height + sign * tabSize;
    const c3x = startX + width/2 - tabSize/2;
    const c3y = startY + height + sign * tabSize;
    const c4x = startX + width/2 - tabSize/2;
    const c4y = startY + height;
    d += ` L ${c1x} ${c1y} C ${c2x} ${c2y}, ${c3x} ${c3y}, ${c4x} ${c4y}`;
    d += ` L ${startX} ${startY + height}`;
  }

  // LEFT EDGE
  if (shape.left === 0) {
    d += ` L ${startX} ${startY}`;
  } else {
    const sign = shape.left * -1;
    const c1x = startX;
    const c1y = startY + height/2 + tabSize/2;
    const c2x = startX + sign * tabSize;
    const c2y = startY + height/2 + tabSize/2;
    const c3x = startX + sign * tabSize;
    const c3y = startY + height/2 - tabSize/2;
    const c4x = startX;
    const c4y = startY + height/2 - tabSize/2;
    d += ` L ${c1x} ${c1y} C ${c2x} ${c2y}, ${c3x} ${c3y}, ${c4x} ${c4y}`;
    d += ` Z`; 
  }

  return d;
};

const ValentinePuzzle: React.FC<ValentinePuzzleProps> = ({ imageSrc, onComplete }) => {
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState({ width: 0, height: 0 });
  const [targetSize, setTargetSize] = useState({ width: 0, height: 0, offsetX: 0, offsetY: 0 });
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (containerRef.current && imageSrc) {
        const { offsetWidth } = containerRef.current;
        const height = 650; 
        setBoardSize({ width: offsetWidth, height });

        const boxMaxWidth = Math.min(offsetWidth * 0.9, 600);
        const boxMaxHeight = height * 0.7; // Reduce height share to leave room for scatter

        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            const aspect = img.width / img.height;
            
            let targetW = boxMaxWidth;
            let targetH = targetW / aspect;

            if (targetH > boxMaxHeight) {
                targetH = boxMaxHeight;
                targetW = targetH * aspect;
            }

            setTargetSize({
                width: targetW,
                height: targetH,
                offsetX: (offsetWidth - targetW) / 2,
                offsetY: (height - targetH) / 2
            });
        };
    }
  }, [imageSrc]); 

  useEffect(() => {
    if (targetSize.width === 0) return;

    const pieceWidth = targetSize.width / COLS;
    const pieceHeight = targetSize.height / ROWS;
    
    const newPieces: PuzzlePiece[] = [];
    const shapes: { top: number; right: number; bottom: number; left: number }[][] = 
        Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

    // Generate shapes
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            shapes[r][c] = {
                top: r === 0 ? 0 : -shapes[r-1][c].bottom, 
                left: c === 0 ? 0 : -shapes[r][c-1].right, 
                right: c === COLS - 1 ? 0 : (Math.random() > 0.5 ? 1 : -1),
                bottom: r === ROWS - 1 ? 0 : (Math.random() > 0.5 ? 1 : -1),
            };
        }
    }

    const SAFE_MARGIN = 10; 

    // Scatter Logic
    // Define available zones around the target:
    // Top: 0 to targetOffsetY
    // Bottom: targetOffsetY + targetHeight to boardHeight
    // Left: 0 to targetOffsetX
    // Right: targetOffsetX + targetWidth to boardWidth
    
    // Valid zones must be > pieceHeight/Width + Margin
    
    const zones = [
        { name: 'top', xMin: 0, xMax: boardSize.width - pieceWidth, yMin: 0, yMax: targetSize.offsetY - pieceHeight },
        { name: 'bottom', xMin: 0, xMax: boardSize.width - pieceWidth, yMin: targetSize.offsetY + targetSize.height, yMax: boardSize.height - pieceHeight },
        { name: 'left', xMin: 0, xMax: targetSize.offsetX - pieceWidth, yMin: 0, yMax: boardSize.height - pieceHeight },
        { name: 'right', xMin: targetSize.offsetX + targetSize.width, xMax: boardSize.width - pieceWidth, yMin: 0, yMax: boardSize.height - pieceHeight },
    ].filter(z => z.xMax > z.xMin && z.yMax > z.yMin);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const correctX = targetSize.offsetX + col * pieceWidth;
        const correctY = targetSize.offsetY + row * pieceHeight;
        
        // Pick a random zone
        let currentX, currentY;
        
        if (zones.length > 0) {
            const zone = zones[Math.floor(Math.random() * zones.length)];
            currentX = zone.xMin + Math.random() * (zone.xMax - zone.xMin);
            currentY = zone.yMin + Math.random() * (zone.yMax - zone.yMin);
        } else {
             // Fallback to random anywhere (with safety buffer)
             const maxX = boardSize.width - pieceWidth;
             const maxY = boardSize.height - pieceHeight;
             const safeMaxX = Math.max(0, maxX - SAFE_MARGIN);
             const safeMaxY = Math.max(0, maxY - SAFE_MARGIN);
             const safeMin = SAFE_MARGIN;
             currentX = safeMin + Math.random() * (safeMaxX - safeMin);
             currentY = safeMin + Math.random() * (safeMaxY - safeMin);
        }

        newPieces.push({
          id: row * COLS + col,
          currentX,
          currentY,
          correctX,
          correctY,
          isPlaced: false,
          shape: shapes[row][col]
        });
      }
    }
    setPieces(newPieces);
  }, [targetSize, boardSize]);

  const handleDragEnd = (id: number, info: PanInfo) => {
    const index = pieces.findIndex(p => p.id === id);
    if(index === -1) return;
    const piece = pieces[index];
    if(piece.isPlaced) return;

    let newX = piece.currentX + info.offset.x;
    let newY = piece.currentY + info.offset.y;

    const pieceWidth = targetSize.width / COLS;
    const pieceHeight = targetSize.height / ROWS;

    newX = Math.max(0, Math.min(newX, boardSize.width - pieceWidth));
    newY = Math.max(0, Math.min(newY, boardSize.height - pieceHeight));

    const threshold = pieceWidth * 0.3; 

    const dist = Math.sqrt(Math.pow(newX - piece.correctX, 2) + Math.pow(newY - piece.correctY, 2));

    const updatedPieces = [...pieces];
    if(dist < threshold) {
        updatedPieces[index].currentX = piece.correctX;
        updatedPieces[index].currentY = piece.correctY;
        updatedPieces[index].isPlaced = true;
    } else {
        updatedPieces[index].currentX = newX;
        updatedPieces[index].currentY = newY;
    }
    setPieces(updatedPieces);

    if(updatedPieces.every(p => p.isPlaced)) {
        setIsCompleted(true);
        onComplete();
    }
  };

  const handleSolve = () => {
      const solvedPieces = pieces.map(p => ({
          ...p,
          currentX: p.correctX,
          currentY: p.correctY,
          isPlaced: true
      }));
      setPieces(solvedPieces);
      setIsCompleted(true);
      onComplete();
  };

  if(!imageSrc || targetSize.width === 0) return <div ref={containerRef} className="w-full h-96" />;

  const pieceWidth = targetSize.width / COLS;
  const pieceHeight = targetSize.height / ROWS;
  const pad = Math.max(pieceWidth, pieceHeight) * 0.5;
  const svgWidth = pieceWidth + pad * 2;
  const svgHeight = pieceHeight + pad * 2;

  // Numeric Constraints
  const constraints = {
    top: 0,
    left: 0,
    right: boardSize.width - pieceWidth,
    bottom: boardSize.height - pieceHeight,
  };

  return (
    <div 
        ref={containerRef} 
        className="relative bg-neutral-100 dark:bg-neutral-800/50 rounded-xl shadow-inner border border-pink-200 dark:border-pink-900 w-full overflow-hidden"
        style={{ height: boardSize.height }}
    >
        <div 
            className="absolute border-2 border-dashed border-pink-300 dark:border-pink-700/50 rounded-lg pointer-events-none"
            style={{
                width: targetSize.width,
                height: targetSize.height,
                left: targetSize.offsetX,
                top: targetSize.offsetY,
            }}
        >
             <div className="absolute inset-0 flex items-center justify-center text-pink-200 dark:text-pink-900/40 text-sm font-medium uppercase tracking-widest">
                Place Pieces Here
            </div>
        </div>

        {pieces.map((piece) => {
            const pathData = getPiecePath(pieceWidth, pieceHeight, piece.shape, pad);
            const col = piece.id % COLS;
            const row = Math.floor(piece.id / COLS);
            const imgX = -col * pieceWidth + pad;
            const imgY = -row * pieceHeight + pad;

            return (
                <motion.div
                    key={piece.id}
                    drag={!piece.isPlaced}
                    dragConstraints={constraints} 
                    dragMomentum={false}
                    dragElastic={0}
                    onDragEnd={(_, info) => handleDragEnd(piece.id, info)}
                    initial={{ x: piece.currentX, y: piece.currentY }} 
                    animate={{
                        x: piece.currentX, 
                        y: piece.currentY,
                        scale: piece.isPlaced ? 1 : 1.05,
                        zIndex: piece.isPlaced ? 1 : 100,
                        filter: piece.isPlaced ? 'drop-shadow(0px 0px 0px rgba(0,0,0,0))' : 'drop-shadow(0px 6px 12px rgba(0,0,0,0.4))'
                    }}
                    whileDrag={{
                        scale: 1.15,
                        cursor: 'grabbing',
                        filter: 'drop-shadow(0px 15px 30px rgba(0,0,0,0.5)) brightness(1.2)'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="absolute"
                    style={{
                        width: pieceWidth,
                        height: pieceHeight,
                        cursor: piece.isPlaced ? 'default' : 'grab',
                    }}
                >
                    <svg 
                        width={svgWidth} 
                        height={svgHeight} 
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                        style={{ 
                            overflow: 'visible',
                            position: 'absolute',
                            top: -pad,
                            left: -pad,
                            pointerEvents: 'none'
                        }}
                    >
                        <defs>
                            <clipPath id={`clip-${piece.id}`}>
                                <path d={pathData} />
                            </clipPath>
                        </defs>
                        
                        <image 
                            href={imageSrc} 
                            x={imgX - 1} 
                            y={imgY - 1} 
                            width={targetSize.width + 2} 
                            height={targetSize.height + 2}
                            clipPath={`url(#clip-${piece.id})`}
                            preserveAspectRatio="none" 
                        />
                        
                        <path 
                            d={pathData} 
                            fill="none" 
                            stroke="white" 
                            strokeWidth="3"     
                            clipPath={`url(#clip-${piece.id})`} 
                            style={{ 
                                mixBlendMode: 'overlay',
                                opacity: 0.8 
                            }}
                        />
                         <path 
                            d={pathData} 
                            fill="none" 
                            stroke="rgba(0,0,0, 0.4)" 
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                </motion.div>
            );
        })}

        {/* Solve Button */}
        {!isCompleted && (
            <button
                onClick={handleSolve}
                className="absolute bottom-4 right-4 bg-pink-500/80 hover:bg-pink-600 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg backdrop-blur-sm transition-all z-[200]"
            >
                Solve Puzzle
            </button>
        )}
    </div>
  );
};

export default ValentinePuzzle;

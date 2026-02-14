import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ArrowClockwise, Heart, Trophy } from '@phosphor-icons/react';
import confetti from 'canvas-confetti';

// Game Constants
const GRAVITY = 0.6;
const FLAP_STRENGTH = -10;
const PIPE_SPEED = 4;
const PIPE_SPAWN_RATE = 1800; 
const HEART_SIZE = 130; 
const BIRD_SIZE = 100;
const PIPE_WIDTH = 140;
const PIPE_GAP = 300; 

interface FlappyHeartGameProps {
  onGameOver: () => void;
}

export default function FlappyHeartGame({ onGameOver }: FlappyHeartGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [countdown, setCountdown] = useState(0); // 0 = no countdown, 3,2,1 = counting down

  // Game State Refs
  const birdY = useRef(200);
  const birdVelocity = useRef(0);
  const pipes = useRef<{ x: number; topHeight: number; passed: boolean }[]>([]);
  const hearts = useRef<{ x: number; y: number; collected: boolean }[]>([]);
  const lastPipeTime = useRef(0);
  const frameId = useRef(0);
  const gameActive = useRef(false);
  
  // Animation Refs
  const birdFrame = useRef(0);
  const lastFrameTime = useRef(0);

  // Images
  const birdImgs = useRef<HTMLImageElement[]>([]);
  const heartImg = useRef<HTMLImageElement | null>(null);
  const obstacleImg = useRef<HTMLImageElement | null>(null);
  
  useEffect(() => {
    // Load Bird Sprite Frames
    const b1 = new Image(); b1.src = "/valentine/feb14/flappy-bird/ValentinesDay2026Flappy_bird-1.png";
    const b2 = new Image(); b2.src = "/valentine/feb14/flappy-bird/ValentinesDay2026Flappy_bird-2.png";
    const b3 = new Image(); b3.src = "/valentine/feb14/flappy-bird/ValentinesDay2026Flappy_bird-3.png";
    birdImgs.current = [b1, b2, b3];

    const hImg = new Image();
    hImg.src = "/valentine/feb14/flappy-bird/ValentinesDay2026Heart.png";
    heartImg.current = hImg;

    const tImg = new Image();
    tImg.src = "/valentine/feb14/flappy-bird/Obstacle.png"; 
    obstacleImg.current = tImg;
  }, []);

  const startCountdown = () => {
      setCountdown(3);
      let count = 3;
      const interval = setInterval(() => {
          count--;
          if (count > 0) {
              setCountdown(count);
          } else {
              clearInterval(interval);
              setCountdown(0);
              startGame();
          }
      }, 1000);
  };

  const startGame = () => {
    setIsPlaying(true);
    setIsGameOver(false);
    setScore(0);
    
    birdY.current = 200;
    birdVelocity.current = 0;
    pipes.current = [];
    hearts.current = [];
    lastPipeTime.current = performance.now();
    gameActive.current = true;

    requestAnimationFrame(gameLoop);
  };

  const flap = () => {
    if (gameActive.current) {
      birdVelocity.current = FLAP_STRENGTH;
    }
  };

  // Keyboard controls
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.code === 'Space' || e.code === 'ArrowUp') && gameActive.current) {
              e.preventDefault();
              flap();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const gameLoop = (timestamp: number) => {
    if (!gameActive.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // --- UPDATE ---
    birdVelocity.current += GRAVITY;
    birdY.current += birdVelocity.current;

    // Animation Frame Update (every 100ms)
    if (timestamp - lastFrameTime.current > 100) {
        birdFrame.current = (birdFrame.current + 1) % birdImgs.current.length;
        lastFrameTime.current = timestamp;
    }

    // Spawn Pipes
    if (timestamp - lastPipeTime.current > PIPE_SPAWN_RATE) {
      const minPipeHeight = 100;
      const maxPipeHeight = canvas.height - PIPE_GAP - minPipeHeight;
      const randomHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1) + minPipeHeight);
      
      pipes.current.push({
        x: canvas.width,
        topHeight: randomHeight,
        passed: false
      });
      
      // Add Heart in the gap center
      hearts.current.push({
         x: canvas.width + PIPE_WIDTH / 2 - HEART_SIZE / 2,
         y: randomHeight + PIPE_GAP / 2 - HEART_SIZE / 2,
         collected: false
       });

      lastPipeTime.current = timestamp;
    }

    // Move & Collision
    pipes.current.forEach(pipe => {
      pipe.x -= PIPE_SPEED;

      // Generous buffer for larger sprites
      const buffer = 25; 
      if (
        birdY.current + buffer < pipe.topHeight || 
        birdY.current + BIRD_SIZE - buffer > pipe.topHeight + PIPE_GAP
      ) {
         if (
           50 + BIRD_SIZE - buffer > pipe.x && 
           50 + buffer < pipe.x + PIPE_WIDTH
         ) {
           handleGameOver();
         }
      }
      
      if (!pipe.passed && pipe.x + PIPE_WIDTH < 50) {
        pipe.passed = true;
      }
    });

    hearts.current.forEach(heart => {
      heart.x -= PIPE_SPEED;
      if (!heart.collected) {
         if (
            50 < heart.x + HEART_SIZE &&
            50 + BIRD_SIZE > heart.x &&
            birdY.current < heart.y + HEART_SIZE &&
            birdY.current + BIRD_SIZE > heart.y
         ) {
            heart.collected = true;
            setScore(prev => prev + 1);
         }
      }
    });

    pipes.current = pipes.current.filter(p => p.x > -PIPE_WIDTH);
    hearts.current = hearts.current.filter(h => h.x > -HEART_SIZE);

    if (birdY.current > canvas.height || birdY.current < -BIRD_SIZE) {
      handleGameOver();
    }

    // --- DRAW ---
    
    // Light/Themed Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#e0f2fe"); // sky-100
    gradient.addColorStop(1, "#fce7f3"); // pink-100
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Clouds (Procedural simple circles for now to keep it light)
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(100, 100, 40, 0, Math.PI * 2);
    ctx.arc(150, 100, 50, 0, Math.PI * 2);
    ctx.arc(200, 100, 40, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(600, 150, 60, 0, Math.PI * 2);
    ctx.arc(680, 150, 70, 0, Math.PI * 2);
    ctx.arc(760, 150, 60, 0, Math.PI * 2);
    ctx.fill();

    pipes.current.forEach(pipe => {
        if (obstacleImg.current && obstacleImg.current.complete && obstacleImg.current.height) {
             const img = obstacleImg.current;
             const aspectRatio = img.naturalHeight / img.naturalWidth;
             const drawHeight = PIPE_WIDTH * aspectRatio;

             // Top Obstacle (flipped)
             // We want the 'base' of the image to be at pipe.topHeight
             ctx.save();
             ctx.translate(pipe.x + PIPE_WIDTH/2, pipe.topHeight);
             ctx.scale(1, -1);
             // Draw full height based on ratio, let it clip top of screen if needed
             ctx.drawImage(img, -PIPE_WIDTH/2, 0, PIPE_WIDTH, drawHeight); 
             ctx.restore();
 
             // Bottom Obstacle
             // We want the 'base' of the image to be at pipe.topHeight + PIPE_GAP
             ctx.drawImage(img, pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, drawHeight); 
        } else {
            ctx.fillStyle = "#ec4899"; // Fallback pink
            ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
            ctx.fillRect(pipe.x, pipe.topHeight + PIPE_GAP, PIPE_WIDTH, canvas.height);
        }
    });

    hearts.current.forEach(heart => {
        if (!heart.collected && heartImg.current) {
            // Bobbing animation
            const bob = Math.sin(timestamp / 200) * 5;
            ctx.drawImage(heartImg.current, heart.x, heart.y + bob, HEART_SIZE, HEART_SIZE);
        }
    });

    if (birdImgs.current.length > 0 && birdImgs.current[birdFrame.current]) {
        ctx.save();
        ctx.translate(50 + BIRD_SIZE / 2, birdY.current + BIRD_SIZE / 2);
        const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (birdVelocity.current * 0.05)));
        ctx.rotate(rotation);
        
        const currentBird = birdImgs.current[birdFrame.current];
        ctx.drawImage(currentBird, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
        ctx.restore();
    } else {
        ctx.fillStyle = "yellow";
        ctx.fillRect(50, birdY.current, BIRD_SIZE, BIRD_SIZE);
    }
    
    // Draw Ground
    ctx.fillStyle = "#fbcfe8"; // pink-200 ground
    ctx.fillRect(0, canvas.height - 20, canvas.width, 20);
    ctx.fillStyle = "#f472b6"; // darker pink border
    ctx.fillRect(0, canvas.height - 25, canvas.width, 5);

    if (gameActive.current) {
        frameId.current = requestAnimationFrame(gameLoop);
    }
  };

  const handleGameOver = () => {
    gameActive.current = false;
    cancelAnimationFrame(frameId.current);
    setIsPlaying(false);
    setIsGameOver(true);
    // Fire confetti!
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ef4444', '#ec4899', '#f472b6'] 
    });
    onGameOver();
  };
  
  useEffect(() => {
     return () => cancelAnimationFrame(frameId.current);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl mx-auto">
      <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border-8 border-white dark:border-pink-900 bg-sky-100">
        <canvas 
          ref={canvasRef}
          width={1000} 
          height={700} 
          className="w-full h-auto cursor-pointer touch-none block"
          onClick={flap} 
        />
        
        {isPlaying && (
            <div className="absolute top-6 right-6 flex items-center gap-3 bg-white/80 backdrop-blur px-6 py-2 rounded-full border-2 border-pink-200 shadow-lg z-10">
              <Heart size={32} weight="fill" className="text-red-500 animate-pulse" />
              <span className="text-pink-600 font-bold text-4xl font-mono">{score}</span>
            </div>
        )}
        
        <AnimatePresence>
          {countdown > 0 && (
              <motion.div 
                  className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <div className="relative flex items-center justify-center">
                      <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="text-pink-500 opacity-30 absolute"
                      >
                          <Heart size={350} weight="fill" />
                      </motion.div>
                      
                      <motion.div 
                          key={countdown}
                          initial={{ scale: 0.5, opacity: 0, y: 20 }}
                          animate={{ scale: 1, opacity: 1, y: 0 }}
                          exit={{ scale: 1.5, opacity: 0, y: -20 }}
                          className="text-[12rem] font-bold text-white drop-shadow-[0_4px_15px_rgba(236,72,153,0.9)] font-great-vibes z-10 relative"
                      >
                          {countdown}
                      </motion.div>
                  </div>
              </motion.div>
          )}
        </AnimatePresence>

        {!isPlaying && !isGameOver && countdown === 0 && (
          <div className="absolute inset-0 bg-white/40 flex flex-col items-center justify-center p-6 text-center text-pink-700 backdrop-blur-sm">
              <h3 className="text-7xl font-bold mb-6 drop-shadow-xl text-pink-600 font-great-vibes tracking-wide stroke-white">Flappy Bird</h3>
              <p className="mb-10 text-2xl font-bold max-w-md text-pink-800 font-quicksand">Help the love bird navigate the clouds! ❤️</p>
              <button 
                onClick={(e) => { e.stopPropagation(); startCountdown(); }}
                className="px-12 py-5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-full font-bold text-2xl text-white shadow-xl flex items-center gap-4 transition-all transform hover:scale-105 active:scale-95 border-4 border-white/60"
              >
                <Play weight="fill" size={32} /> Play Now
              </button>
          </div>
        )}

        {isGameOver && (
            <div className="absolute inset-0 bg-white/60 flex flex-col items-center justify-center p-6 text-center text-pink-800 backdrop-blur-md">
              <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white/80 p-10 rounded-3xl border border-pink-200 shadow-2xl backdrop-blur-xl"
              >
                  <div className="flex justify-center mb-6">
                      <Trophy size={64} weight="fill" className="text-yellow-400 drop-shadow-md animate-bounce" />
                  </div>
                  <h3 className="text-7xl font-bold mb-4 text-pink-500 drop-shadow-lg font-great-vibes">Game Over!</h3>
                  <p className="text-3xl font-medium font-quicksand">You collected <span className="text-pink-600 font-bold text-4xl mx-2 ">{score}</span> hearts!</p>
              </motion.div>
            </div>
        )}
      </div>

      {isGameOver && (
        <motion.button 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={(e) => { e.stopPropagation(); startCountdown(); }}
          className="px-10 py-4 bg-pink-500 text-white hover:bg-pink-600 rounded-full font-bold text-xl shadow-lg flex items-center justify-center gap-3 transition-transform hover:scale-105"
        >
          <ArrowClockwise weight="bold" size={24} /> Try Again
        </motion.button>
      )}
    </div>
  );
}

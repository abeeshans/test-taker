import React from 'react';
import { motion } from 'framer-motion';

interface ParallaxIntroProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export default function ParallaxIntro({ containerRef }: ParallaxIntroProps) {
  // Removed scroll-based parallax. Just simple floating animations.
  const cloud1Y = 0;
  const cloud2Y = 0;
  const cloud3Y = 0;
  
  const beeY = 0;
  const birdY = 0;

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-b from-sky-300 to-sky-100 dark:from-sky-900 dark:to-slate-900">
      
      {/* Background Clouds */}
      <motion.div style={{ y: cloud1Y }} className="absolute top-10 left-[10%] opacity-80 z-0">
         <img src="/valentine/feb14/parallax_intro/Cloud1.png" alt="Cloud" className="w-64" />
      </motion.div>
      <motion.div style={{ y: cloud2Y }} className="absolute top-40 right-[15%] opacity-70 z-0">
         <img src="/valentine/feb14/parallax_intro/Cloud2.png" alt="Cloud" className="w-48" />
      </motion.div>
      <motion.div style={{ y: cloud3Y }} className="absolute bottom-20 left-[20%] opacity-90 z-0">
         <img src="/valentine/feb14/parallax_intro/Cloud3.png" alt="Cloud" className="w-80" />
      </motion.div>

      {/* Main Characters */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">
        <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-600 mb-12 drop-shadow-md text-center font-great-vibes bg-white py-4 leading-relaxed">
          Happy Valentine's Day!
        </h1>
        
        <div className="flex items-center justify-center gap-12 md:gap-32 will-change-transform">
             <motion.div 
               style={{ y: birdY }}
               animate={{ 
                 y: [0, -20, 0],
                 rotate: [0, 5, -5, 0],
                 filter: [
                    "drop-shadow(0 0 15px rgba(236, 72, 153, 0.6))", 
                    "drop-shadow(0 0 30px rgba(236, 72, 153, 0.8))", 
                    "drop-shadow(0 0 15px rgba(236, 72, 153, 0.6))"
                 ]
               }}
               transition={{ 
                 duration: 3, 
                 repeat: Infinity,
                 ease: "easeInOut"
               }}
               className="w-48 md:w-80"
             >
                <img src="/valentine/feb14/parallax_intro/Bird.png" alt="Bird" className="w-full drop-shadow-2xl" />
             </motion.div>

             <motion.div 
               style={{ y: beeY }}
               animate={{ 
                 y: [0, 20, 0],
                 rotate: [0, -5, 5, 0],
                 filter: [
                    "drop-shadow(0 0 15px rgba(236, 72, 153, 0.6))", 
                    "drop-shadow(0 0 30px rgba(236, 72, 153, 0.8))", 
                    "drop-shadow(0 0 15px rgba(236, 72, 153, 0.6))"
                 ]
               }}
               transition={{ 
                 duration: 2.5, 
                 repeat: Infinity,
                 ease: "easeInOut",
                 delay: 0.5
               }}
               className="w-40 md:w-64"
             >
                <img src="/valentine/feb14/parallax_intro/Bee.png" alt="Bee" className="w-full drop-shadow-2xl" />
             </motion.div>
        </div>
        
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-10 animate-bounce text-pink-500 font-bold tracking-widest uppercase font-quicksand"
        >
            Scroll to explore ↓
        </motion.div>
      </div>
    </div>
  );
}

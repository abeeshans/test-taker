import React from 'react';
import { motion } from 'framer-motion';

interface TimelineEvent {
  year: string;
  image: string;
  title: string;
  description: string;
  imagePosition?: string; // e.g. 'object-top', 'object-center', etc.
}

const events: TimelineEvent[] = [
  {
    year: '2022',
    image: '/valentine/feb14/timeline/2022-09-28_IKEA.JPG',
    title: 'IKEA Date',
    description: "The first picture we took together and the day this officially all started! We have to run it back, I'll get you the daim cake next time we go ☺️",
  },
  {
    year: '2023',
    image: '/valentine/feb14/timeline/2023-05-31_Sugar-beach.jpg',
    title: 'Sugar beach',
    description: "A random beach that just happened to be close to my office has turned into one of my favorite spots in Toronto because it's the spot of our first kiss!",
  },
  {
    year: '2024',
    image: '/valentine/feb14/timeline/2024-03-22_Dressing-up.jpg',
    title: 'All Dressed Up',
    description: "You look SO good when you're all dressed up - whether it's for a function or a fancy date, I love how good you look 😍",
    imagePosition: 'object-[50%_20%]',
  },
  {
    year: '2024',
    image: '/valentine/feb14/timeline/2024-07-06_Apiraam-Wedding.jpg',
    title: 'Weddings',
    description: "I can't wait to attend more weddings with you!! I know how much you love weddings and I can't wait to be by your side while we celebrate more together!",
    imagePosition: 'object-[50%_20%]',
  },
  {
    year: '2025',
    image: '/valentine/feb14/timeline/2025-06-21_Silly-wigs.JPG',
    title: 'Being Weirdos together',
    description: "You're a weirdo, but you're my weirdo and I love you for how unapologetically silly you can be!",
  },
  {
    year: '2025',
    image: '/valentine/feb14/timeline/2025-06-26_Proposal.jpg',
    title: "You're my favorite",
    description: "We're engaged!! I'm getting used to calling you my fiancée but I can't help but think wife sounds better 😏",
  },
  {
    year: '2025',
    image: '/valentine/feb14/timeline/2025-08-19_Monography.jpg',
    title: 'My favorite tradition',
    description: "This year's monography is going to be the best one yet! We'll get our poses ready beforehand, look super cute, and hopefully this time also be on time so we're not rushing 🫣",
    imagePosition: 'object-top',
  },
  {
    year: '2025',
    image: '/valentine/feb14/timeline/2025-09-05_Rome.jpg',
    title: 'Travelling',
    description: "My favorite travel partner! I can't wait to travel to more countries with you ❤️",
  },
  {
    year: '2026',
    image: '/valentine/feb14/timeline/2026-01-02_Date.JPG',
    title: 'Date nights',
    description: "This was our last picture together! I can't wait for more date nights when you're back love. I have so many new places we need to go to, so hopefully we can hit at least one of them next time you're here.",
  },
];

export default function LoveTimeline() {
  return (
    <div className="py-20 bg-pink-50 dark:bg-slate-900 relative rounded-3xl mb-12 overflow-hidden">
        <h2 className="text-4xl md:text-6xl font-bold text-center text-pink-600 dark:text-pink-400 mb-16 font-great-vibes z-10 relative">
            A small look back in time
        </h2>
        
        {/* Background Dashed Line */}
        <div className="absolute top-40 bottom-20 left-1/2 w-1 border-l-4 border-dashed border-pink-200 dark:border-pink-900/50 -translate-x-1/2 z-0 hidden md:block" />

        <div className="max-w-5xl mx-auto px-6 relative z-10 flex flex-col gap-24 md:gap-0">
            {events.map((event, index) => {
                const isEven = index % 2 === 0;
                return (
                    <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={`md:flex items-center justify-between w-full mb-12 md:mb-24 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}
                    >
                        {/* Image Side */}
                        <div className="w-full md:w-5/12">
                            <motion.div 
                                whileHover={{ scale: 1.05, rotate: isEven ? 2 : -2 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className={`relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-700 ${isEven ? 'rotate-2' : '-rotate-2'}`}
                            >
                                <img 
                                    src={event.image} 
                                    alt={event.title} 
                                    className={`w-full h-full object-cover ${event.imagePosition || 'object-center'}`} 
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                     <p className="text-white font-bold">{event.year}</p>
                                </div>
                            </motion.div>
                        </div>

                        {/* Center Dot (Desktop Only) */}
                        <div className="hidden md:flex w-2/12 justify-center relative">
                            <div className="w-8 h-8 bg-pink-500 rounded-full border-4 border-white shadow-lg z-10" />
                        </div>

                        {/* Content Side */}
                        <div className="w-full md:w-5/12 text-center md:text-left mt-6 md:mt-0 p-4">
                             <div className={`flex flex-col ${isEven ? 'md:items-start' : 'md:items-end'}`}>
                                <span className="inline-block px-4 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 rounded-full text-sm font-bold mb-3 shadow-sm">
                                    {event.year}
                                </span>
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2 font-quicksand">
                                    {event.title}
                                </h3>
                                <p className={`text-gray-600 dark:text-gray-400 leading-relaxed ${isEven ? 'md:text-left' : 'md:text-right'}`}>
                                    {event.description}
                                </p>
                             </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    </div>
  );
}

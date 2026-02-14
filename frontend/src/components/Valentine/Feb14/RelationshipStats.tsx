import React from 'react';
import { motion } from 'framer-motion';
import { GlobeHemisphereWest, ChatCircleDots, Car, Heart } from '@phosphor-icons/react';

const stats = [
  {
    id: 1,
    icon: GlobeHemisphereWest,
    label: "Countries Visited",
    value: "3",
    detail: "Canada, UK, and Italy... a lifetime's worth of countries to go",
    color: "text-blue-500",
    bg: "bg-blue-100 dark:bg-blue-900/30",
  },
  {
    id: 2,
    icon: ChatCircleDots,
    label: "Fav Phrase Stolen",
    value: "\"Vibes\"",
    detail: "It's a tic for me now",
    color: "text-pink-500",
    bg: "bg-pink-100 dark:bg-pink-900/30",
  },
  {
    id: 3,
    icon: Heart,
    label: "FaceTime Hours",
    value: "10,000+",
    detail: "Distance means nothing when you mean everything",
    color: "text-red-500",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  {
    id: 4,
    icon: ChatCircleDots,
    label: "Phrase You Stole",
    value: "\"What the-\"",
    detail: "You want to be me so bad",
    color: "text-purple-500",
    bg: "bg-purple-100 dark:bg-purple-900/30",
  },
];

export default function RelationshipStats() {
  return (
    <div className="py-20 px-6 bg-white dark:bg-slate-800">
      <h2 className="text-3xl md:text-5xl font-bold text-center text-gray-800 dark:text-gray-200 mb-16 font-great-vibes">
        A few stats about us
      </h2>
      
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 justify-center items-stretch">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="flex-1 bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-6 hover:shadow-xl transition-shadow border border-gray-100 dark:border-slate-600 flex flex-col items-center text-center min-w-[200px]"
          >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${stat.bg} ${stat.color}`}>
              <stat.icon size={32} weight="fill" />
            </div>
            
            <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-2">{stat.value}</h3>
            <p className="text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider text-sm mb-4">{stat.label}</p>
            <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed">{stat.detail}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

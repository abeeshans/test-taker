import React, { useMemo } from 'react';
import BaseModal from './BaseModal';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TestAttempt } from '@/types';
import { Eye } from '@phosphor-icons/react';

interface ProgressGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  testTitle: string;
  attempts: TestAttempt[];
}

export default function ProgressGraphModal({ isOpen, onClose, testTitle, attempts }: ProgressGraphModalProps) {
  
  const data = useMemo(() => {
    // Filter out resets and sort by date ascending
    const validAttempts = attempts
      .filter(a => !a.is_reset)
      .sort((a, b) => new Date(a.completed_at).getTime() - new Date(b.completed_at).getTime());

    return validAttempts.map((a, i) => ({
      index: i,
      date: new Date(a.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      fullDate: new Date(a.completed_at).toLocaleString(),
      score: Math.round((a.score / a.total_questions) * 100),
      setName: a.set_name || 'Test',
      attemptId: a.id,
      awayClicks: a.away_clicks || 0
    }));
  }, [attempts]);

  const CustomTooltip = ({ active, payload, coordinate, viewBox }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      
      // Smart positioning: if close to right edge, shift left
      const xPos = coordinate?.x || 0;
      const chartWidth = viewBox?.width || 0;
      const isNearRightEdge = chartWidth > 0 && xPos > chartWidth * 0.7; // If past 70% of width
      
      const style = isNearRightEdge ? { transform: 'translateX(-100%)', marginLeft: -10 } : { marginLeft: 10 };

      return (
        <div 
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-3 border border-purple-100 dark:border-purple-900/30 rounded-xl shadow-xl text-sm ring-1 ring-black/5 transition-all duration-200"
          style={style}
        >
          <p className="font-bold text-gray-900 dark:text-white mb-1">{dataPoint.fullDate}</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <p className="text-purple-600 dark:text-purple-400 font-bold text-lg">{dataPoint.score}%</p>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-gray-500 dark:text-slate-400 text-xs bg-gray-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full inline-block">
              {dataPoint.setName}
            </p>
            {dataPoint.awayClicks > 0 && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400 bg-gray-900 border border-orange-500/50 px-2 py-0.5 rounded-full shadow-sm">
                <Eye size={14} weight="bold" />
                <span>{dataPoint.awayClicks}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={`Progress: ${testTitle}`} maxWidth="max-w-4xl">
      <div className="h-[400px] w-full p-6 bg-white dark:bg-slate-900 rounded-xl">
        {data.length < 2 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 italic gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
               <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
               </svg>
            </div>
            <p>Complete at least 2 tests to see your progress graph.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-slate-800" />
              <XAxis 
                dataKey="index" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dy={10}
                tickFormatter={(i) => data[i]?.date || ''}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                domain={[0, 100]} 
                unit="%"
                dx={-10}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: '#9333ea', strokeWidth: 1, strokeDasharray: '4 4' }}
                wrapperStyle={{ zIndex: 1000, pointerEvents: 'none' }}
                useTranslate3d={false}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#9333ea" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                activeDot={{ r: 6, strokeWidth: 4, stroke: '#fff', fill: '#9333ea' }}
                dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: '#9333ea' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </BaseModal>
  );
}

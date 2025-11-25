import React, { useState } from 'react';
import { CheckCircle, XCircle, Flag, Circle, CaretDown, CaretUp } from '@phosphor-icons/react';

export interface QuestionStatus {
  index: number;
  status: 'correct' | 'incorrect' | 'unanswered';
  isFlagged: boolean;
}

interface ReviewStatsNavigationProps {
  questions: QuestionStatus[];
  onNavigate: (index: number) => void;
}

export default function ReviewStatsNavigation({ questions, onNavigate }: ReviewStatsNavigationProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const stats = {
    correct: questions.filter(q => q.status === 'correct'),
    incorrect: questions.filter(q => q.status === 'incorrect'),
    unanswered: questions.filter(q => q.status === 'unanswered'),
    flagged: questions.filter(q => q.isFlagged),
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const renderSection = (
    key: 'correct' | 'incorrect' | 'unanswered' | 'flagged',
    title: string,
    icon: React.ReactNode,
    colorClass: string,
    bgClass: string
  ) => {
    const items = stats[key];
    const isExpanded = expandedSection === key;

    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => toggleSection(key)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-full ${bgClass} ${colorClass}`}>
              {icon}
            </div>
            <div className="text-left">
              <div className="text-xs text-gray-500 dark:text-slate-400 font-medium uppercase tracking-wider">{title}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{items.length}</div>
            </div>
          </div>
          {isExpanded ? (
            <CaretUp size={16} className="text-gray-400" />
          ) : (
            <CaretDown size={16} className="text-gray-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200">
            <div className="h-px bg-gray-100 dark:bg-slate-700 mb-3" />
            {items.length > 0 ? (
              <div className="grid grid-cols-5 gap-2">
                {items.map((item) => (
                  <button
                    key={item.index}
                    onClick={() => onNavigate(item.index)}
                    className={`aspect-square rounded flex items-center justify-center text-xs font-medium transition-colors ${bgClass} ${colorClass} hover:opacity-80`}
                  >
                    {item.index + 1}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400 dark:text-slate-500 italic text-center py-2">
                None found
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 w-64">
      {renderSection(
        'correct',
        'Correct',
        <CheckCircle size={16} weight="fill" />,
        'text-green-600 dark:text-green-400',
        'bg-green-100 dark:bg-green-900/30'
      )}
      {renderSection(
        'incorrect',
        'Incorrect',
        <XCircle size={16} weight="fill" />,
        'text-red-600 dark:text-red-400',
        'bg-red-100 dark:bg-red-900/30'
      )}
      {renderSection(
        'unanswered',
        'Unanswered',
        <Circle size={16} weight="bold" />,
        'text-yellow-600 dark:text-yellow-400',
        'bg-yellow-100 dark:bg-yellow-900/30'
      )}
      {renderSection(
        'flagged',
        'Flagged',
        <Flag size={16} weight="fill" />,
        'text-orange-600 dark:text-orange-400',
        'bg-orange-100 dark:bg-orange-900/30'
      )}
    </div>
  );
}

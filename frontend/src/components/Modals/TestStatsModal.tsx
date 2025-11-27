import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BaseModal from './BaseModal';
import { createClient } from '@/utils/supabase/client';
import { API_URL } from '@/lib/api';
import { 
  CaretLeft, 
  CaretRight, 
  CalendarBlank, 
  ListBullets, 
  CaretDown, 
  CaretUp, 
  Funnel,
  MagnifyingGlass,
  CheckCircle,
  XCircle
} from '@phosphor-icons/react';
import ReviewTestModal from './ReviewTestModal';
import { TestAttempt, Test, TestStats } from '@/types';

interface TestStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTestId?: string | null;
  refreshTrigger?: number;
}

interface GroupedStats {
  id: string;
  title: string;
  children?: GroupedStats[];
  stats: TestStats;
}

interface TestNode {
  id: string;
  title: string;
  isSet: boolean;
  stats: TestStats;
  children?: TestNode[];
}



// Helper to get days in a month
const getDaysInMonth = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

const calculateStats = (attempts: TestAttempt[]): TestStats => {
  if (attempts.length === 0) {
    return { attempts: 0, avgScore: null, bestScore: null, avgTime: null, lastDate: null };
  }

  const activeAttempts = attempts.filter(a => !a.is_reset);

  if (activeAttempts.length === 0) {
    return { attempts: 0, avgScore: null, bestScore: null, avgTime: null, lastDate: null };
  }

  const scores = activeAttempts.map(a => (a.total_questions > 0 ? (a.score / a.total_questions) * 100 : 0));
  const times = activeAttempts.map(a => a.time_taken);
  
  // Sort by date descending for last date
  const sortedAttempts = [...activeAttempts].sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());

  return {
    attempts: activeAttempts.length,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    bestScore: Math.round(Math.max(...scores)),
    avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    lastDate: sortedAttempts[0].completed_at
  };
};

const formatTime = (seconds: number | null) => {
  if (seconds === null) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function TestStatsModal({ isOpen, onClose, initialTestId, refreshTrigger }: TestStatsModalProps) {
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list'); // Default to list based on screenshot
  const supabase = createClient();
  
  // Review Modal State
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTestId, setReviewTestId] = useState<string | null>(null);
  const [reviewTestTitle, setReviewTestTitle] = useState<string>("");
  const [reviewAttemptId, setReviewAttemptId] = useState<string | undefined>(undefined);
  
  // Calendar State
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  // List View State
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'attempted' | 'unattempted'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = React.useRef<HTMLDivElement>(null);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'lastDate', direction: 'desc' });

  const fetchStats = async () => {
    try {
      setLoading(true);
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      const [attemptsRes, testsRes] = await Promise.all([
        fetch(`${API_URL}/attempts`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }),
        fetch(`${API_URL}/tests`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
      ]);

      if (attemptsRes.ok && testsRes.ok) {
        const attemptsData = await attemptsRes.json();
        const testsData = await testsRes.json();
        setAttempts(attemptsData);
        setTests(testsData);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Always fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  // Also refresh when refreshTrigger changes (even if modal is closed)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      // Clear cached data so next open will show fresh data
      setTests([]);
      setAttempts([]);
    }
  }, [refreshTrigger]);

  // Reset states when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setFilterStatus('all');
      setExpandedTests(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calendar Logic
  const getAttemptsForDate = (date: Date) => {
    return attempts.filter(a => {
      const aDate = new Date(a.completed_at);
      return aDate.getDate() === date.getDate() &&
             aDate.getMonth() === date.getMonth() &&
             aDate.getFullYear() === date.getFullYear();
    });
  };

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  const processedData = useMemo(() => {
    const groups: { [key: string]: Test[] } = {};
    const singleTests: Test[] = [];

    // 1. Group tests by base name (e.g. "Math - Set 1" -> "Math")
    tests.forEach(test => {
      // Use sets property if available (from backend)
      if (test.sets && test.sets.length > 1) {
         // It's a multi-set test container
         if (!groups[test.id]) {
             groups[test.id] = [];
         }
         groups[test.id].push(test);
      } else if (test.set_count > 1) {
         // Fallback if sets property missing but set_count > 1
         if (!groups[test.id]) {
             groups[test.id] = [];
         }
         groups[test.id].push(test);
      } else {
         // Check for naming convention "Name - Set X"
         const match = test.title.match(/^(.*?)(?:\s-\sSet\s\d+)?$/);
         const baseName = match ? match[1] : test.title;
         
         if (test.title.includes(' - Set ')) {
            if (!groups[baseName]) {
              groups[baseName] = [];
            }
            groups[baseName].push(test);
         } else {
            singleTests.push(test);
         }
      }
    });

    const result: GroupedStats[] = [];

    // Process groups
    Object.keys(groups).forEach(key => {
      const groupTests = groups[key];
      // If key is a test ID (from sets property logic), groupTests has 1 item
      // If key is a baseName (from regex), groupTests has multiple items
      
      let baseName = key;
      let children: GroupedStats[] = [];
      let parentStats;

      if (groupTests.length === 1 && ((groupTests[0].sets && groupTests[0].sets.length > 1) || groupTests[0].set_count > 1)) {
          // It's a container test with multiple sets
          const test = groupTests[0];
          baseName = test.title;
          
          if (test.sets && test.sets.length > 0) {
              children = test.sets.map(set => {
                  const setAttempts = attempts.filter(a => a.test_id === test.id && a.set_name === set.title);
                  return {
                      id: `${test.id}-${set.title}`,
                      title: set.title,
                      stats: calculateStats(setAttempts)
                  };
              });
          } else {
              // Fallback
              for (let i = 1; i <= test.set_count; i++) {
                  const setName = `Set ${i}`;
                  const setAttempts = attempts.filter(a => a.test_id === test.id && a.set_name === setName);
                  children.push({
                      id: `${test.id}-${setName}`,
                      title: setName,
                      stats: calculateStats(setAttempts)
                  });
              }
          }
          const allAttempts = attempts.filter(a => a.test_id === test.id);
          parentStats = calculateStats(allAttempts);
          
          result.push({
            id: test.id,
            title: test.title,
            children,
            stats: parentStats
          });
      } else {
          // It's a group of separate files (regex match) OR a single file that got grouped
          
          if (groupTests.length === 1) {
             // Treat as single test
             const test = groupTests[0];
             const testAttempts = attempts.filter(a => a.test_id === test.id);
             result.push({
               id: test.id,
               title: test.title,
               stats: calculateStats(testAttempts)
             });
          } else {
              children = groupTests.map(test => {
                const testAttempts = attempts.filter(a => a.test_id === test.id);
                return {
                  id: test.id,
                  title: test.title,
                  stats: calculateStats(testAttempts)
                };
              });
              
              const allAttempts = attempts.filter(a => groupTests.some(t => t.id === a.test_id));
              parentStats = calculateStats(allAttempts);
              
              result.push({
                id: `group-${baseName}`,
                title: baseName,
                children,
                stats: parentStats
              });
          }
      }
    });

    // Process single tests
    singleTests.forEach(test => {
      const testAttempts = attempts.filter(a => a.test_id === test.id);
      const stats = calculateStats(testAttempts);
      
      result.push({
        id: test.id,
        title: test.title,
        stats: stats
      });
    });

    // Filter
    let filtered = result;
    if (filterStatus === 'attempted') {
      filtered = result.filter(node => node.stats.attempts > 0);
    } else if (filterStatus === 'unattempted') {
      filtered = result.filter(node => node.stats.attempts === 0);
    }

    // Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(node => 
        node.title.toLowerCase().includes(lowerQuery) || 
        (node.children && node.children.some(child => child.title.toLowerCase().includes(lowerQuery)))
      );
    }

    // Sort
    if (sortConfig) {
      filtered.sort((a, b) => {
        const aValue = sortConfig.key === 'title' ? a.title : (a.stats as any)[sortConfig.key];
        const bValue = sortConfig.key === 'title' ? b.title : (b.stats as any)[sortConfig.key];
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [tests, attempts, searchQuery, sortConfig, filterStatus]);



  const toggleExpand = useCallback((id: string) => {
    setExpandedTests(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(id)) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
      return newExpanded;
    });
  }, []);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <div className="w-4" />;
    return sortConfig.direction === 'asc' ? <CaretUp size={14} weight="bold" /> : <CaretDown size={14} weight="bold" />;
  };

  // Memoized TestRow component to prevent unnecessary re-renders
  const TestRow = memo(({ node, isExpanded, onToggle }: { node: GroupedStats; isExpanded: boolean; onToggle: (id: string) => void }) => {
    const handleReviewClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      const relevantAttempts = attempts.filter(a => a.test_id === node.id);
      if (relevantAttempts.length > 0) {
        relevantAttempts.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
        const latestAttempt = relevantAttempts[0];
        setReviewTestId(node.id);
        setReviewTestTitle(node.title);
        setReviewAttemptId(latestAttempt.id);
        setShowReviewModal(true);
      }
    };

    return (
      <React.Fragment>
        {/* Parent Row */}
        <motion.tr 
          layout
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors group"
        >
          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-6 flex justify-center">
              {node.children ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-500 dark:text-slate-400 transition-colors"
                >
                  {isExpanded ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
                </button>
              ) : (
                <div className="w-6" /> // Placeholder for alignment
              )}
            </div>
            <div className="flex flex-col">
              <span>{node.title}</span>
              <span className="text-xs text-gray-400 dark:text-slate-500 font-normal">{node.id.split('-')[0]}.json</span>
            </div>
          </td>
          <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
            {node.stats.lastDate ? new Date(node.stats.lastDate).toLocaleDateString() : '-'}
          </td>
          <td className="px-6 py-4 text-gray-500 dark:text-slate-400">
            {node.stats.attempts}
          </td>
          <td className="px-6 py-4 text-purple-600 dark:text-purple-400 font-semibold">
            {node.stats.avgScore !== null ? `${node.stats.avgScore}%` : '-'}
          </td>
          <td className="px-6 py-4 text-purple-600 dark:text-purple-400 font-semibold">
            {node.stats.bestScore !== null ? `${node.stats.bestScore}%` : '-'}
          </td>
          <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-slate-400">
            {formatTime(node.stats.avgTime)}
          </td>
          <td className="px-6 py-4">
             {node.stats.attempts > 0 && !node.id.startsWith('group-') && (
               <button
                 onClick={handleReviewClick}
                 className="text-xs font-medium px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors border border-blue-200 dark:border-blue-800 cursor-pointer"
               >
                 Review last test
               </button>
             )}
          </td>
        </motion.tr>

        {/* Children Rows */}
        <AnimatePresence>
          {isExpanded && node.children?.map(child => (
            <motion.tr 
              key={child.id} 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-50/50 dark:bg-slate-900/30 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
            >
              <td className="px-6 py-3 pl-14 font-medium text-gray-600 dark:text-slate-300 text-sm">
                {child.title}
              </td>
              <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400">
                {child.stats.lastDate ? new Date(child.stats.lastDate).toLocaleDateString() : '-'}
              </td>
              <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400">
                {child.stats.attempts}
              </td>
              <td className="px-6 py-3 text-sm text-purple-600 dark:text-purple-400 font-semibold">
                {child.stats.avgScore !== null ? `${child.stats.avgScore}%` : '-'}
              </td>
              <td className="px-6 py-3 text-sm text-purple-600 dark:text-purple-400 font-semibold">
                {child.stats.bestScore !== null ? `${child.stats.bestScore}%` : '-'}
              </td>
              <td className="px-6 py-3 font-mono text-xs text-gray-500 dark:text-slate-400">
                {formatTime(child.stats.avgTime)}
              </td>
              <td className="px-6 py-3">
                {/* No review button for child rows - only on parent */}
              </td>
            </motion.tr>
          ))}
        </AnimatePresence>
      </React.Fragment>
    );
  });

  return (
    <BaseModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Test Statistics" 
      maxWidth="max-w-7xl"
      contentClassName="p-0 overflow-hidden flex flex-col"
    >
      <div className="flex flex-col h-auto max-h-[80vh] p-6">
        {/* Header & Controls */}
        <div className="flex flex-col gap-4 mb-4 border-b border-gray-200 dark:border-slate-700 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ${
                  viewMode === 'list' ? 'bg-purple-600 dark:bg-purple-600 text-white shadow-sm' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600'
                }`}
              >
                <ListBullets size={18} /> List
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all hover:scale-105 active:scale-95 ${
                  viewMode === 'calendar' ? 'bg-purple-600 dark:bg-purple-600 text-white shadow-sm' : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600'
                }`}
              >
                <CalendarBlank size={18} /> Calendar
              </button>
            </div>
            
            {/* Stats Summary */}
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Total Attempts: <span className="font-bold text-gray-800 dark:text-white">{attempts.filter(a => !a.is_reset).length}</span>
            </div>
          </div>

          {viewMode === 'list' && (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search tests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-400"
                />
              </div>
              <div className="relative" ref={filterMenuRef}>
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`p-2 border rounded-lg transition-all hover:scale-105 active:scale-95 ${
                    filterStatus !== 'all' 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-700' 
                      : 'border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Funnel size={20} weight={filterStatus !== 'all' ? 'fill' : 'regular'} />
                </button>
                
                <AnimatePresence>
                  {showFilterMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden"
                    >
                      <div className="p-1">
                        <button
                          onClick={() => { setFilterStatus('all'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                            filterStatus === 'all' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {filterStatus === 'all' && <CheckCircle size={16} weight="fill" />}
                          <span className={filterStatus === 'all' ? 'font-medium' : 'ml-6'}>All Tests</span>
                        </button>
                        <button
                          onClick={() => { setFilterStatus('attempted'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                            filterStatus === 'attempted' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {filterStatus === 'attempted' && <CheckCircle size={16} weight="fill" />}
                          <span className={filterStatus === 'attempted' ? 'font-medium' : 'ml-6'}>Attempted</span>
                        </button>
                        <button
                          onClick={() => { setFilterStatus('unattempted'); setShowFilterMenu(false); }}
                          className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 ${
                            filterStatus === 'unattempted' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          {filterStatus === 'unattempted' && <CheckCircle size={16} weight="fill" />}
                          <span className={filterStatus === 'unattempted' ? 'font-medium' : 'ml-6'}>Unattempted</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-1 custom-scrollbar overflow-x-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-slate-400">Loading stats...</div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'calendar' ? (
                <motion.div 
                  key="calendar"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full"
                >
                  {/* Year Navigation */}
                  <div className="flex items-center justify-center mb-4 gap-4">
                    <button onClick={() => setCurrentYear(prev => prev - 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-600 dark:text-slate-300">
                      <CaretLeft size={24} />
                    </button>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{currentYear}</h2>
                    <button onClick={() => setCurrentYear(prev => prev + 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-600 dark:text-slate-300">
                      <CaretRight size={24} />
                    </button>
                  </div>

                  {/* Months Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {months.map(monthIndex => {
                      const monthName = new Date(currentYear, monthIndex).toLocaleString('default', { month: 'long' });
                      const days = getDaysInMonth(currentYear, monthIndex);
                      const startDay = new Date(currentYear, monthIndex, 1).getDay(); // 0=Sun
                      
                      return (
                        <div key={monthIndex} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-2 shadow-sm">
                          <h3 className="font-semibold text-gray-700 dark:text-slate-200 mb-2 text-center text-sm">{monthName}</h3>
                          <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                            {['S','M','T','W','T','F','S'].map((d, i) => (
                              <div key={`${d}-${i}`} className="text-[9px] text-gray-400 dark:text-slate-500 font-medium">{d}</div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-0.5 text-center">
                            {Array.from({ length: startDay }).map((_, i) => <div key={`pad-${i}`} />)}
                            {days.map(date => {
                              const dayAttempts = getAttemptsForDate(date);
                              const hasAttempts = dayAttempts.length > 0;
                              const isToday = new Date().toDateString() === date.toDateString();
                              
                              return (
                                <div key={date.toISOString()} className="relative group">
                                  <div 
                                    className={`w-5 h-5 mx-auto flex items-center justify-center rounded-full text-xs cursor-default transition-colors ${
                                      hasAttempts 
                                        ? 'bg-purple-500 dark:bg-purple-600 text-white font-bold shadow-sm' 
                                        : isToday 
                                          ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-semibold'
                                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                                    }`}
                                  >
                                    {date.getDate()}
                                  </div>
                                  {hasAttempts && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-72">
                                      <div className="bg-gray-900 text-white text-xs rounded-md py-2 px-3 shadow-xl max-h-96 overflow-y-auto custom-scrollbar">
                                        <div className="font-bold mb-1 border-b border-gray-700 pb-1">
                                          {date.toLocaleDateString()}
                                        </div>
                                        <div className="space-y-1">
                                          {dayAttempts.map((att, i) => {
                                            const completedTime = new Date(att.completed_at);
                                            const hours = completedTime.getHours();
                                            const minutes = completedTime.getMinutes();
                                            const ampm = hours >= 12 ? 'PM' : 'AM';
                                            const displayHours = hours % 12 || 12;
                                            const displayMinutes = minutes.toString().padStart(2, '0');
                                            const timeString = `${displayHours}:${displayMinutes} ${ampm}`;
                                            
                                            return (
                                              <button 
                                                key={i} 
                                                onClick={() => {
                                                  setReviewTestId(att.test_id);
                                                  setReviewTestTitle(att.test_title || 'Test');
                                                  setReviewAttemptId(att.id);
                                                  setShowReviewModal(true);
                                                }}
                                                className="flex justify-between gap-2 w-full hover:bg-gray-800 rounded px-1 py-0.5 text-left"
                                              >
                                                <span className="flex-1 flex flex-col">
                                                  <span className="flex items-center gap-2">
                                                    {att.test_title || 'Test'} {att.set_name ? `[${att.set_name}]` : ''}
                                                    {att.is_reset && <span className="text-[10px] px-1 rounded bg-gray-700 text-gray-300">Reset</span>}
                                                  </span>
                                                  <span className="text-[10px] text-gray-400">{timeString}</span>
                                                </span>
                                                <span className={(att.score / att.total_questions) >= 0.8 ? 'text-green-400' : 'text-yellow-400'}>
                                                  {Math.round((att.score / att.total_questions) * 100)}%
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <div className="w-2 h-2 bg-gray-900 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                /* List View */
                <motion.div 
                  key="list"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <table className="min-w-full text-sm text-left text-gray-500 dark:text-slate-400">
                    <thead className="text-xs text-gray-700 dark:text-slate-300 uppercase bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => handleSort('title')}>
                          <div className="flex items-center gap-1">Test <SortIcon column="title" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => handleSort('lastDate')}>
                          <div className="flex items-center gap-1">Last <SortIcon column="lastDate" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => handleSort('attempts')}>
                          <div className="flex items-center gap-1">Attempts <SortIcon column="attempts" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => handleSort('avgScore')}>
                          <div className="flex items-center gap-1">Avg % <SortIcon column="avgScore" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => handleSort('bestScore')}>
                          <div className="flex items-center gap-1">Best % <SortIcon column="bestScore" /></div>
                        </th>
                        <th className="px-6 py-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700" onClick={() => handleSort('avgTime')}>
                          <div className="flex items-center gap-1">Avg Time <SortIcon column="avgTime" /></div>
                        </th>
                        <th className="px-6 py-3">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      <AnimatePresence mode="popLayout">
                        {processedData.length === 0 ? (
                          <motion.tr 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                          >
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400 italic">
                              No tests found matching your criteria.
                            </td>
                          </motion.tr>
                        ) : (
                          processedData.map((node) => (
                            <TestRow 
                              key={node.id} 
                              node={node} 
                              isExpanded={expandedTests.has(node.id)} 
                              onToggle={toggleExpand} 
                            />
                          ))
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
      
      {/* Review Modal */}
      {showReviewModal && reviewTestId && (
        <ReviewTestModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setReviewTestId(null);
            setReviewAttemptId(undefined);
          }}
          testId={reviewTestId}
          testTitle={reviewTestTitle}
          attemptId={reviewAttemptId}
        />
      )}
    </BaseModal>
  );
}

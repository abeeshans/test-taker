'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { 
  Flag, 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  Pause, 
  Play, 
  CheckCircle, 
  XCircle, 
  Eye, 
  List, 
  X,
  CaretDown,
  CaretUp,
  Question,
  SignOut,
  ListBullets,
  Desktop
} from '@phosphor-icons/react'
import { API_URL } from '@/lib/api'
import HelpModal from '@/components/Modals/HelpModal'
import ReviewStatsNavigation, { QuestionStatus } from './ReviewStatsNavigation'

interface Question {
  passage?: string
  question: string
  options: string[]
  correctAnswer: string
  explanation?: string
}

interface TestSet {
  title: string
  questions: Question[]
}

interface TestContent {
  sets: TestSet[]
}

interface TestTakerProps {
  testId: string
  initialData: {
    title: string
    content: TestContent
  }
  timeLimit: number | null
}

export default function TestTaker({ testId, initialData, timeLimit }: TestTakerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // State
  const [selectedSetIndex, setSelectedSetIndex] = useState<number | 'all' | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([])
  const [flagged, setFlagged] = useState<boolean[]>([])
  const [everFlagged, setEverFlagged] = useState<boolean[]>([])
  const [strikethroughs, setStrikethroughs] = useState<Set<number>[]>([])
  
  const [timeLeft, setTimeLeft] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [awayClicks, setAwayClicks] = useState(0)
  const [startTime, setStartTime] = useState<number>(0)
  
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [wasPausedBeforeHelp, setWasPausedBeforeHelp] = useState(false)
  const [viewMode, setViewMode] = useState<'test' | 'list'>('test')

  // Helper to get current set title for multi-set tests
  const getSetTitle = useMemo(() => {
    if (selectedSetIndex === null) return null
    if (initialData.content.sets.length <= 1) return null // Don't show for single-set tests
    
    if (selectedSetIndex === 'all') return 'All Sets'
    return initialData.content.sets[selectedSetIndex]?.title || `Set ${selectedSetIndex + 1}`
  }, [selectedSetIndex, initialData.content.sets])

  // Initialize Test Selection
  useEffect(() => {
    const setParam = searchParams.get('set')
    
    if (setParam !== null) {
        handleSetSelection(parseInt(setParam))
    } else if (initialData.content.sets.length === 1) {
        // If only 1 set, auto-select it
        handleSetSelection(0)
    } else {
        // Wait for user selection (if not passed in URL, though dashboard should pass it now)
        // If we came directly here without set param but multiple sets exist, we show selection screen
    }
  }, [initialData, searchParams])

  const handleSetSelection = (index: number | 'all') => {
    let selectedQuestions: Question[] = []
    
    if (index === 'all') {
      initialData.content.sets.forEach(set => {
        selectedQuestions.push(...set.questions)
      })
    } else {
      selectedQuestions = initialData.content.sets[index].questions
    }

    setQuestions(selectedQuestions)
    setUserAnswers(new Array(selectedQuestions.length).fill(null))
    setFlagged(new Array(selectedQuestions.length).fill(false))
    setEverFlagged(new Array(selectedQuestions.length).fill(false))
    setStrikethroughs(new Array(selectedQuestions.length).fill(null).map(() => new Set()))
    
    // Timer setup
    if (timeLimit) {
      setTimeLeft(timeLimit * 60)
    } else {
      setTimeLeft(60 * 60) // Default 60 mins
    }
    setStartTime(Date.now())
    setSelectedSetIndex(index)
  }

  // Timer Logic
  useEffect(() => {
    if (selectedSetIndex === null || isPaused || isFinished || isReviewMode || isHelpOpen) return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          finishTest()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isPaused, isFinished, isReviewMode, selectedSetIndex, isHelpOpen])

  // Anti-cheat
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && selectedSetIndex !== null && !isFinished && !isPaused && !isReviewMode) {
        setAwayClicks(prev => prev + 1)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isFinished, isPaused, isReviewMode, selectedSetIndex])

  // Keyboard Shortcuts - Optimized with useCallback
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Allow arrow keys in review mode
    if (isFinished && !isReviewMode) return

    // P key to pause/resume (toggle)
    if (e.key.toLowerCase() === 'p' && !isReviewMode) {
      setIsPaused(prev => !prev)
      return
    }

    // F key to flag/unflag (toggle - works even when paused, but not when help is open or in review mode)
    if (e.key.toLowerCase() === 'f' && !isHelpOpen && !isReviewMode) {
      toggleFlag()
      return
    }

    // Don't process other keys if paused or help is open
    if (isPaused || isHelpOpen) return

    if (e.key === 'ArrowRight') {
      setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))
    } else if (e.key === 'ArrowLeft') {
      setCurrentIndex(prev => Math.max(0, prev - 1))
    } else if (/^[1-9]$/.test(e.key)) {
      const index = parseInt(e.key) - 1
      const currentQ = questions[currentIndex]
      if (currentQ && index < currentQ.options.length) {
          handleAnswer(currentQ.options[index])
      }
    }
  }, [isFinished, isPaused, isReviewMode, currentIndex, questions.length, isHelpOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Handle Logout
  const handleLogoutClick = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Handle opening help modal (auto-pause)
  const handleOpenHelp = () => {
    if (!isFinished && !isReviewMode) {
      setWasPausedBeforeHelp(isPaused)
      if (!isPaused) {
        setIsPaused(true)
      }
    }
    setIsHelpOpen(true)
  }

  // Handle closing help modal (auto-resume if wasn't manually paused)
  const handleCloseHelp = () => {
    setIsHelpOpen(false)
    if (!isFinished && !isReviewMode && !wasPausedBeforeHelp) {
      setIsPaused(false)
    }
  }

  // Handle finish confirmation
  const handleFinishClick = () => {
    setShowFinishConfirm(true)
  }

  const confirmFinish = () => {
    setShowFinishConfirm(false)
    finishTest()
  }

  // Handle exit to dashboard
  const handleExitClick = () => {
    if (!isFinished) {
      setShowLeaveConfirm(true)
    } else {
      setShowExitConfirm(true)
    }
  }

  const confirmExit = () => {
    router.push('/dashboard')
  }

  // Handlers
  const handleAnswer = (option: string) => {
    if (isFinished || isPaused || isReviewMode) return
    const newAnswers = [...userAnswers]
    newAnswers[currentIndex] = option
    setUserAnswers(newAnswers)
  }

  const toggleFlag = () => {
    const newFlags = [...flagged]
    newFlags[currentIndex] = !newFlags[currentIndex]
    setFlagged(newFlags)
    
    // Track if this question was ever flagged
    if (newFlags[currentIndex]) {
      const newEverFlagged = [...everFlagged]
      newEverFlagged[currentIndex] = true
      setEverFlagged(newEverFlagged)
    }
  }

  const toggleStrikethrough = (optionIndex: number) => {
    if (isReviewMode) return
    const newStrikes = [...strikethroughs]
    const currentSet = new Set(newStrikes[currentIndex])
    if (currentSet.has(optionIndex)) {
      currentSet.delete(optionIndex)
    } else {
      currentSet.add(optionIndex)
    }
    newStrikes[currentIndex] = currentSet
    setStrikethroughs(newStrikes)
  }

  const finishTest = async () => {
    setIsFinished(true)
    const score = calculateScore
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await fetch(`${API_URL}/attempts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            test_id: testId,
            score: score,
            total_questions: questions.length,
            time_taken: timeTaken,
            away_clicks: awayClicks,
            set_name: typeof selectedSetIndex === 'number' 
              ? (initialData.content.sets[selectedSetIndex]?.title || `Set ${selectedSetIndex + 1}`)
              : 'All Sets',
            details: questions.map((q, i) => ({
              question: q.question,
              user_answer: userAnswers[i],
              correct_answer: q.correctAnswer,
              is_correct: userAnswers[i] === q.correctAnswer,
              was_flagged: everFlagged[i],
              strikethroughs: Array.from(strikethroughs[i] || [])
            }))
          }),
        })
      }
    } catch (error) {
      console.error('Error saving attempt:', error)
    }
  }

  // Memoize score calculation for performance
  const calculateScore = useMemo(() => {
    let score = 0
    questions.forEach((q, i) => {
      if (userAnswers[i] === q.correctAnswer) score++
    })
    return score
  }, [questions, userAnswers])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Render: Set Selection (Fallback if not passed via URL)
  if (selectedSetIndex === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg max-w-md w-full p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Select a Set</h2>
          <p className="text-gray-500 dark:text-slate-400 mb-6">Choose which part of the test you want to take.</p>
          
          <div className="space-y-3">
            {initialData.content.sets.map((set, idx) => (
              <button
                key={idx}
                onClick={() => handleSetSelection(idx)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-purple-500 hover:bg-blue-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800 group"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-purple-400">{set.title}</span>
                  <span className="text-sm text-gray-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-purple-400">{set.questions.length} Qs</span>
                </div>
              </button>
            ))}
            
            {initialData.content.sets.length > 1 && (
              <button
                onClick={() => handleSetSelection('all')}
                className="w-full text-left p-4 rounded-lg border-2 border-blue-100 dark:border-purple-900/50 bg-blue-50 dark:bg-purple-900/20 hover:bg-blue-100 dark:hover:bg-purple-900/30 hover:border-blue-300 dark:hover:border-purple-700 mt-4"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-800 dark:text-purple-400">All Sets</span>
                  <span className="text-sm text-blue-600 dark:text-purple-400">
                    {initialData.content.sets.reduce((acc, s) => acc + s.questions.length, 0)} Qs
                  </span>
                </div>
              </button>
            )}
          </div>

          <button 
            onClick={() => router.back()}
            className="mt-6 w-full py-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // Render: Results
  if (isFinished && !isReviewMode) {
    const score = calculateScore
    const percentage = Math.round((score / questions.length) * 100)

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 animate-in fade-in zoom-in duration-300">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-white">Test Results</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
              <p className="text-gray-500 dark:text-slate-400 mb-1">Score</p>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{score} <span className="text-xl text-gray-400 dark:text-slate-500 font-normal">/ {questions.length}</span></p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-xl text-center border border-gray-100 dark:border-slate-600">
              <p className="text-gray-500 dark:text-slate-400 mb-1">Percentage</p>
              <p className="text-4xl font-bold text-gray-800 dark:text-white">{percentage}%</p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-xl text-center border border-gray-100 dark:border-slate-600">
              <p className="text-gray-500 dark:text-slate-400 mb-1">Away Clicks</p>
              <p className={`text-3xl font-bold ${awayClicks > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-slate-300'}`}>{awayClicks}</p>
            </div>
            <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-xl text-center border border-gray-100 dark:border-slate-600">
              <p className="text-gray-500 dark:text-slate-400 mb-1">Time Left</p>
              <p className="text-3xl font-bold text-gray-600 dark:text-slate-300">{formatTime(timeLeft)}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setIsReviewMode(true)}
              className="w-full py-3 bg-blue-600 dark:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-purple-700 font-medium flex items-center justify-center gap-2"
            >
              <Eye size={20} /> Review Questions
            </button>
            <button 
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentIndex]
  const hasPassage = currentQ.passage && currentQ.passage !== "This question does not have a passage."

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900 overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 h-16 flex items-center justify-between px-6 flex-shrink-0 z-20">
        <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
          <button onClick={handleExitClick} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 flex-shrink-0">
            <ArrowLeft size={20} weight="bold" />
          </button>
          
          {/* Title with Set Name and Score (if review mode) */}
          <h1 className="font-semibold text-gray-800 dark:text-white truncate text-sm md:text-base" title={initialData.title}>
            {initialData.title}
            {getSetTitle && (
              <span className="text-purple-600 dark:text-purple-400"> [{getSetTitle}]</span>
            )}
            {isReviewMode && (
              <span className="text-blue-600 dark:text-blue-400 hidden md:inline"> - {calculateScore}/{questions.length} ({Math.round((calculateScore / questions.length) * 100)}%)</span>
            )}
          </h1>
        </div>

        {/* Center: Finish/Exit Button - Hidden on small mobile, moved to bottom or menu if needed, or just kept small */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 hidden md:flex">
          {!isFinished ? (
            <button 
              onClick={handleFinishClick}
              className="px-6 py-2 bg-blue-600 dark:bg-purple-600 text-white hover:bg-blue-700 dark:hover:bg-purple-700 text-sm font-semibold rounded-lg shadow-md hover:shadow-lg"
            >
              Finish Test
            </button>
          ) : (
            <button 
              onClick={handleExitClick}
              className="px-6 py-2 bg-gray-900 dark:bg-slate-700 text-white hover:bg-gray-800 dark:hover:bg-slate-600 text-sm font-semibold rounded-lg shadow-md hover:shadow-lg"
            >
              Exit to Dashboard
            </button>
          )}
        </div>

        {/* Right Side Controls: View Toggle, Timer, Pause, Help, Logout */}
        <div className="flex items-center gap-3">

          {/* Pause Button */}
          {!isFinished && !isReviewMode && (
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className={`flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-lg font-medium text-sm border-2 ${
                isPaused 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-600 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30' 
                  : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
              title={isPaused ? "Resume Test" : "Pause Test"}
            >
              {isPaused ? (
                <>
                  <Play size={18} weight="fill" />
                  <span className="hidden md:inline">Resume</span>
                </>
              ) : (
                <>
                  <Pause size={18} weight="fill" />
                  <span className="hidden md:inline">Pause</span>
                </>
              )}
            </button>
          )}

          {/* Timer */}
          {!isReviewMode && (
            <div className={`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1.5 rounded-lg ${
              timeLeft < 300 
                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 animate-pulse' 
                : 'text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800'
            }`}>
              <Clock size={20} weight="bold" />
              {formatTime(timeLeft)}
            </div>
          )}
          
          {/* Away Clicks Counter */}
          {!isReviewMode && awayClicks > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-400 text-xs font-bold" title="Times you navigated away from the test">
              <Eye size={16} weight="bold" />
              <span>{awayClicks}</span>
            </div>
          )}

          {/* View Toggle (Review Mode Only) */}
          {isReviewMode && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-700 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('test')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'test' 
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                <Desktop size={18} weight={viewMode === 'test' ? 'fill' : 'regular'} />
                Test View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' 
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                <ListBullets size={18} weight={viewMode === 'list' ? 'fill' : 'regular'} />
                List View
              </button>
            </div>
          )}

          <div className="h-6 w-px bg-gray-300 dark:bg-slate-600"></div>

          {/* Help Button */}
          <button
            onClick={handleOpenHelp}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 border border-transparent hover:border-gray-300 dark:hover:border-slate-600"
            title="Help & Information"
          >
            <Question size={22} weight="bold" />
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogoutClick}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-transparent hover:border-red-200 dark:hover:border-red-800"
            title="Logout"
          >
            <SignOut size={22} weight="bold" />
          </button>
        </div>
      </header>

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={handleCloseHelp} />

      {/* Finish Confirmation Modal */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setShowFinishConfirm(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Finish Test?</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Are you sure you want to finish? You have answered <strong>{userAnswers.filter(a => a !== null).length}</strong> out of <strong>{questions.length}</strong> questions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFinishConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmFinish}
                className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-purple-700 font-semibold shadow-md"
              >
                Finish Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setShowExitConfirm(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Exit to Dashboard?</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-2">
              You can return to review this test anytime from the dashboard.
            </p>
            <p className="text-sm text-gray-500 dark:text-slate-500 mb-6">
              Your results and performance data have been saved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium"
              >
                Stay Here
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-purple-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-purple-700 font-semibold shadow-md"
              >
                Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Test Confirmation Modal (Unsaved Progress) */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setShowLeaveConfirm(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Leave Test?</h3>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/40 mb-6">
              <p className="text-red-800 dark:text-red-400 font-medium flex items-center gap-2">
                <Flag size={20} weight="fill" />
                Warning: Unsaved Progress
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                If you leave now, your progress will not be saved.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium"
              >
                Stay Here
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-md"
              >
                Leave Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal (Global) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setShowLogoutConfirm(false)}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Log Out?</h3>
            <p className="text-gray-600 dark:text-slate-400 mb-6">
              Are you sure you want to log out?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-md"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List View Rendering */}
      {isReviewMode && viewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-slate-900">
          <div className="max-w-6xl mx-auto flex gap-6">
            {/* Questions List */}
            <div className="flex-1 space-y-8 pb-20 min-w-0">
              {questions.map((q, idx) => {
                const isAnswered = userAnswers[idx] !== null
                const isCorrect = userAnswers[idx] === q.correctAnswer
                const isFlaggedQ = everFlagged[idx]

                return (
                  <div key={idx} id={`question-${idx}`} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden scroll-mt-24">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between">
                      <div className="font-semibold text-gray-700 dark:text-slate-300">Question {idx + 1}</div>
                      {isFlaggedQ ? (
                        <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                          <Flag size={14} weight="fill" /> Flagged
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 dark:text-slate-500">Not flagged</div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">{q.question}</h3>
                      
                      <div className="space-y-3">
                        {q.options.map((opt, optIdx) => {
                          const isUserAnswer = userAnswers[idx] === opt
                          const isCorrectAnswer = q.correctAnswer === opt
                          const isStruck = strikethroughs[idx].has(optIdx)
                          
                          let containerClass = 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                          let indicatorClass = 'border-gray-300 dark:border-slate-600 text-transparent'
                          let icon = <div className="w-2 h-2 bg-current rounded-full" />
                          
                          // Check if question was unanswered
                          const isUnanswered = userAnswers[idx] === null
                          
                          if (isCorrectAnswer) {
                            if (isUnanswered) {
                              // Unanswered questions: highlight correct answer in yellow
                              containerClass = 'border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-500 dark:ring-yellow-600'
                              indicatorClass = 'border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-600 text-white'
                              icon = <CheckCircle size={14} weight="bold" />
                            } else {
                              // Answered correctly: green
                              containerClass = 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500 dark:ring-green-600'
                              indicatorClass = 'border-green-500 dark:border-green-600 bg-green-500 dark:bg-green-600 text-white'
                              icon = <CheckCircle size={14} weight="bold" />
                            }
                          } else if (isUserAnswer && !isCorrect) {
                            containerClass = 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                            indicatorClass = 'border-red-500 dark:border-red-600 bg-red-500 dark:bg-red-600 text-white'
                            icon = <XCircle size={14} weight="bold" />
                          }

                          return (
                            <div key={optIdx} className={`p-4 rounded-xl border flex items-center gap-4 ${containerClass}`}>
                              <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${indicatorClass}`}>
                                {icon}
                              </div>
                              <span className={`text-base ${isStruck ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-700 dark:text-slate-300'}`}>{opt}</span>
                              {isUserAnswer && (
                                <span className="ml-auto text-xs font-medium text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                  Your answer
                                </span>
                              )}
                              {isCorrectAnswer && (
                                <span className="ml-auto text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                                  Correct
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {q.explanation && (
                        <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                          <div className="flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-400 font-semibold">
                            <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded"><Eye size={16} /></div>
                            Explanation
                          </div>
                          <p className="text-blue-900 dark:text-blue-300 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Floating Stats Sidebar */}
            <div className="hidden xl:block w-64 flex-shrink-0">
              <div className="sticky top-6">
                <ReviewStatsNavigation 
                  questions={questions.map((q, i) => ({
                    index: i,
                    status: userAnswers[i] === null ? 'unanswered' : (userAnswers[i] === q.correctAnswer ? 'correct' : 'incorrect'),
                    isFlagged: everFlagged[i]
                  }))}
                  onNavigate={(index) => {
                    const el = document.getElementById(`question-${index}`)
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
      /* Main Split View - Persistent Layout (Test View) */
      /* Main Split View - Persistent Layout (Test View) */
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left Pane: Passage (Always visible, empty if no passage) */}
        <div className={`w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto p-4 md:p-8 custom-scrollbar ${hasPassage ? 'h-1/3 lg:h-auto min-h-[150px]' : 'hidden lg:block'}`}>
            {hasPassage ? (
                <div className="max-w-2xl mx-auto">
                    <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4 sticky top-0 bg-white dark:bg-slate-800 py-2">Passage</h3>
                    <div 
                        className="prose prose-blue max-w-none text-gray-800 dark:text-slate-300 leading-relaxed font-serif dark:prose-invert text-sm md:text-base"
                        dangerouslySetInnerHTML={{ __html: currentQ.passage! }} 
                    />
                </div>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-300 dark:text-slate-600 italic">
                    No passage for this question
                </div>
            )}
        </div>

        {/* Right Pane: Question */}
        <div className="w-full lg:w-1/2 bg-gray-50 dark:bg-slate-900 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24">
          <div className="max-w-2xl mx-auto">
            {/* Question Header & Nav */}
            <div className="flex justify-between items-start mb-6">
               <button
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-300 dark:hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
              >
                <ArrowLeft size={14} weight="bold" /> Previous
              </button>

              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-medium text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <button 
                  onClick={toggleFlag}
                  disabled={isReviewMode}
                  className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full ${
                    flagged[currentIndex] 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400'
                  }`}
                >
                  <Flag size={14} weight={flagged[currentIndex] ? "fill" : "regular"} />
                  {flagged[currentIndex] ? 'Flagged' : 'Flag for Review'}
                </button>
              </div>

              <button
                onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-slate-700 text-white hover:bg-gray-800 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
              >
                Next <ArrowRight size={14} weight="bold" />
              </button>
            </div>

            {/* Question Text */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white leading-relaxed">{currentQ.question}</h2>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = userAnswers[currentIndex] === opt
                const isStruck = strikethroughs[currentIndex].has(idx)
                const isCorrect = currentQ.correctAnswer === opt
                
                let containerClass = 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-purple-500 hover:shadow-sm'
                let indicatorClass = 'border-gray-300 dark:border-slate-600 text-transparent'
                
                if (isReviewMode) {
                  // Check if question was unanswered
                  const isUnanswered = userAnswers[currentIndex] === null
                  
                  if (isCorrect) {
                    if (isUnanswered) {
                      // Unanswered questions: highlight correct answer in yellow
                      containerClass = 'border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-500 dark:ring-yellow-600'
                      indicatorClass = 'border-yellow-500 dark:border-yellow-600 bg-yellow-500 dark:bg-yellow-600 text-white'
                    } else {
                      // Answered correctly: green
                      containerClass = 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500 dark:ring-green-600'
                      indicatorClass = 'border-green-500 dark:border-green-600 bg-green-500 dark:bg-green-600 text-white'
                    }
                  } else if (isSelected && !isCorrect) {
                    containerClass = 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                    indicatorClass = 'border-red-500 dark:border-red-600 bg-red-500 dark:bg-red-600 text-white'
                  } else if (isSelected) {
                     // Should be covered by first case
                     containerClass = 'border-gray-200 dark:border-slate-700 opacity-60'
                  }
                } else {
                  if (isSelected) {
                    containerClass = 'border-blue-500 dark:border-purple-600 bg-blue-50 dark:bg-purple-900/20 ring-1 ring-blue-500 dark:ring-purple-600'
                    indicatorClass = 'border-blue-500 dark:border-purple-600 bg-blue-500 dark:bg-purple-600 text-white'
                  } else if (isStruck) {
                    containerClass = 'border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 opacity-60'
                    indicatorClass = 'border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700'
                  }
                }

                return (
                  <div key={idx} className="relative group">
                    <button
                      onClick={() => handleAnswer(opt)}
                      disabled={isPaused || isStruck || isReviewMode}
                      className={`w-full text-left p-4 rounded-xl border flex items-center gap-4 ${containerClass}`}
                    >
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${indicatorClass}`}>
                        {isReviewMode && isCorrect ? <CheckCircle size={14} weight="bold" /> :
                         isReviewMode && isSelected && !isCorrect ? <XCircle size={14} weight="bold" /> :
                         <div className="w-2 h-2 bg-current rounded-full" />}
                      </div>
                      <span className={`text-base ${isStruck ? 'line-through text-gray-400 dark:text-slate-500' : 'text-gray-700 dark:text-slate-300'}`}>
                        {opt}
                      </span>
                    </button>
                    
                    {!isReviewMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleStrikethrough(idx)
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100"
                        title="Strikethrough option"
                      >
                        <span className="text-xs font-bold">S</span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Explanation (Review Mode) */}
            {isReviewMode && currentQ.explanation && (
              <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/40 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-400 font-semibold">
                   <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded"><Eye size={16} /></div>
                   Explanation
                </div>
                <p className="text-blue-900 dark:text-blue-300 leading-relaxed">{currentQ.explanation}</p>
              </div>
            )}

            {/* Navigation Buttons (Removed from bottom) */}
          </div>
        </div>

        {/* Navigation Modal (Centered) */}
        {isNavOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => setIsNavOpen(false)}
            />
            
            {/* Modal Panel */}
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-white">Question Navigation</h3>
                <button onClick={() => setIsNavOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                  {questions.map((_, idx) => {
                    const isCurrent = idx === currentIndex
                    const isAnswered = userAnswers[idx] !== null
                    const isFlaggedQ = isReviewMode ? everFlagged[idx] : flagged[idx]
                    const isCorrect = userAnswers[idx] === questions[idx].correctAnswer
                    
                    let bgClass = 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 border border-gray-200 dark:border-slate-600 shadow-sm'
                    
                    if (isReviewMode) {
                      if (isCorrect && isAnswered) bgClass = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700'
                      else if (isCorrect && !isAnswered) bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
                      else if (!isCorrect && isAnswered) bgClass = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700'
                      else bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700' // Unanswered incorrect (shouldn't happen if we check isCorrect logic properly, but for safety)
                      
                      // Refined logic:
                      // Correct Answered -> Green
                      // Incorrect Answered -> Red
                      // Unanswered -> Yellow (regardless of correct/incorrect because user didn't answer)
                      // Wait, if unanswered, it's technically "incorrect" score-wise, but we want to show it as unanswered.
                      
                      if (!isAnswered) {
                          bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
                      } else if (isCorrect) {
                          bgClass = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700'
                      } else {
                          bgClass = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700'
                      }
                    } else {
                      if (isAnswered) bgClass = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700'
                      if (isFlaggedQ) bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
                    }
                    
                    if (isCurrent) {
                        bgClass = 'bg-blue-600 dark:bg-purple-600 text-white border-blue-600 dark:border-purple-600 shadow-md ring-2 ring-blue-200 dark:ring-purple-400 ring-offset-1'
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentIndex(idx)
                          setIsNavOpen(false)
                        }}
                        className={`aspect-square rounded-lg text-xs font-medium flex items-center justify-center relative ${bgClass}`}
                      >
                        {idx + 1}
                        {/* Show flag icon for ever-flagged questions in review mode */}
                        {isReviewMode && everFlagged[idx] && (
                          <Flag size={14} weight="fill" className="absolute top-0 right-0 text-red-600 dark:text-red-400" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 rounded-b-xl">
                <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-slate-400">
                   <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 dark:bg-purple-600 rounded-full"></div> Current</div>
                   {isReviewMode ? (
                     <>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full"></div> Correct</div>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-full"></div> Incorrect</div>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-full"></div> Unanswered</div>
                       <div className="flex items-center gap-2">
                         <Flag size={12} weight="fill" className="text-red-600 dark:text-red-400" />
                         Ever Flagged
                       </div>
                     </>
                   ) : (
                     <>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full"></div> Answered</div>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-full"></div> Unanswered</div>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-full"></div> Flagged</div>
                     </>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
      )}

      {/* Bottom Center Navigation Button */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 w-full justify-center px-4">
         <button 
           onClick={() => setIsNavOpen(true)}
           className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-slate-700 text-white rounded-full shadow-lg hover:bg-gray-800 dark:hover:bg-slate-600"
         >
            <List size={18} weight="bold" />
            <span className="text-sm font-medium">Q {currentIndex + 1} / {questions.length}</span>
            {flagged[currentIndex] && <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full ml-1" />}
         </button>

         {/* Mobile Finish Button (visible only on small screens where header button is hidden) */}
         <button 
            onClick={isFinished ? handleExitClick : handleFinishClick}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-purple-600 text-white rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-purple-700"
         >
            <span className="text-sm font-bold">{isFinished ? 'Exit' : 'Finish'}</span>
         </button>
      </div>

      {/* Pause Overlay */}
      {isPaused && !isHelpOpen && (
        <div className="fixed inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto p-8">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Pause size={40} weight="fill" className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Test Paused</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-8 text-lg">Take a breather. Your progress is safe.</p>
            <button
              onClick={() => setIsPaused(false)}
              className="px-8 py-3 bg-blue-600 dark:bg-purple-600 text-white rounded-full hover:bg-blue-700 dark:hover:bg-purple-700 font-medium text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Resume Test
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

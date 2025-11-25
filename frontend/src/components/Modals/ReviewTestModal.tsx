'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { API_URL } from '@/lib/api'
import BaseModal from './BaseModal'
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  XCircle, 
  Eye,
  List,
  X,
  Flag,
  ListBullets,
  Desktop
} from '@phosphor-icons/react'
import ReviewStatsNavigation, { QuestionStatus } from '../ReviewStatsNavigation'

interface ReviewTestModalProps {
  isOpen: boolean
  onClose: () => void
  testId: string
  testTitle: string
  attemptId?: string // Optional: if provided, review this specific attempt
}

interface QuestionDetail {
  question: string
  user_answer: string | null
  correct_answer: string
  is_correct: boolean
  was_flagged?: boolean
  strikethroughs?: number[]
}

interface TestAttempt {
  id: string
  test_id: string
  score: number
  total_questions: number
  completed_at: string
  set_name: string
  details: QuestionDetail[]
  is_reset?: boolean
  time_taken?: number
  away_clicks?: number
}

interface TestData {
  title: string
  content: {
    sets: {
      title: string
      questions: {
        passage?: string
        question: string
        options: string[]
        correctAnswer: string
        explanation?: string
      }[]
    }[]
  }
}

export default function ReviewTestModal({ isOpen, onClose, testId, testTitle, attemptId }: ReviewTestModalProps) {
  const [loading, setLoading] = useState(false)
  const [attempt, setAttempt] = useState<TestAttempt | null>(null)
  const [testData, setTestData] = useState<TestData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'test' | 'list'>('test')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && testId) {
      fetchAttemptData()
    }
  }, [isOpen, testId, attemptId])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !attempt) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => Math.min(attempt.details.length - 1, prev + 1))
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => Math.max(0, prev - 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, attempt, currentIndex])

  const fetchAttemptData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // If attemptId is provided, fetch that specific attempt
      // Otherwise fetch all attempts and pick the last one
      const attemptUrl = attemptId 
        ? `${API_URL}/attempts/${attemptId}`
        : `${API_URL}/attempts?test_id=${testId}`

      const [attemptRes, testRes] = await Promise.all([
        fetch(attemptUrl, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }),
        fetch(`${API_URL}/tests/${testId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
      ])

      if (!attemptRes.ok || !testRes.ok) {
        throw new Error('Failed to load attempt or test data')
      }

      const attemptData = await attemptRes.json()
      const test = await testRes.json()

      let targetAttempt: TestAttempt | undefined

      if (attemptId) {
        // Single attempt fetched
        targetAttempt = attemptData
      } else {
        // Array of attempts fetched
        const attempts = attemptData as TestAttempt[]
        if (attempts.length === 0) {
          setError('No attempts found for this test')
          return
        }
        // Get the most recent non-reset attempt
        targetAttempt = attempts.find((a: TestAttempt) => !a.is_reset)
      }

      if (!targetAttempt || !targetAttempt.details) {
        setError('No review data available')
        return
      }

      setAttempt(targetAttempt)
      setTestData(test)
      setCurrentIndex(0)
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching attempt:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
  }

  // if (!isOpen) return null - Removed to allow exit animation

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-slate-400">Loading review...</p>
          </div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center max-w-md">
            <XCircle size={48} className="text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 text-lg font-medium mb-2">Unable to Load Review</p>
            <p className="text-gray-600 dark:text-slate-400 text-sm">{error}</p>
            <button
              onClick={handleClose}
              className="mt-4 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )
    }

    if (!attempt || !testData) {
      return (
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500 dark:text-slate-400">No data available</p>
        </div>
      )
    }

    if (viewMode === 'list') {
      return (
        <div className="h-full flex flex-col bg-gray-50 dark:bg-slate-900">
          {/* Header - matches test page layout */}
          <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-700 px-6 py-4 bg-white dark:bg-slate-800">
            <div className="flex items-center justify-between">
              {/* Left: Test title */}
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{testTitle}</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {attempt.set_name} • {new Date(attempt.completed_at).toLocaleDateString()}
                </p>
              </div>

              {/* Center: Results */}
              <div className="flex-1 flex justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {attempt.score}/{attempt.total_questions}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">
                    {Math.round((attempt.score / attempt.total_questions) * 100)}%
                  </div>
                </div>
              </div>

              {/* Right: Time and away clicks */}
              <div className="flex-1 flex items-center justify-end gap-3">
                <div className="flex items-center gap-2 font-mono text-lg font-bold px-3 py-1.5 rounded-lg text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {attempt.time_taken ? `${Math.floor(attempt.time_taken / 60)}:${(attempt.time_taken % 60).toString().padStart(2, '0')}` : '--:--'}
                </div>
                {attempt.away_clicks !== undefined && attempt.away_clicks > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-400 text-xs font-bold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{attempt.away_clicks}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto flex gap-6">
              {/* Questions List */}
              <div className="flex-1 space-y-8 pb-20 min-w-0">
                {attempt.details.map((detail, idx) => {
                  // Find the corresponding question from test data
                  let questionData: any = null
                  for (const set of testData.content.sets) {
                    const matchedQ = set.questions.find(q => q.question === detail.question)
                    if (matchedQ) {
                      questionData = matchedQ
                      break
                    }
                  }

                  return (
                    <div key={idx} id={`review-question-${idx}`} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden scroll-mt-24">
                      <div className="p-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between">
                        <div className="font-semibold text-gray-700 dark:text-slate-300">Question {idx + 1}</div>
                        {detail.was_flagged ? (
                          <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium">
                            <Flag size={14} weight="fill" /> Flagged
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 dark:text-slate-500">Not flagged</div>
                        )}
                      </div>
                      
                      <div className="p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">{detail.question}</h3>
                        
                        <div className="space-y-3">
                          {questionData?.options.map((opt: string, optIdx: number) => {
                            const isUserAnswer = detail.user_answer === opt
                            const isCorrectAnswer = detail.correct_answer === opt
                            const isStruck = detail.strikethroughs?.includes(optIdx)
                            
                            let containerClass = 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                            let indicatorClass = 'border-gray-300 dark:border-slate-600 text-transparent'
                            let icon = <div className="w-2 h-2 bg-current rounded-full" />
                            
                            // Check if question was unanswered
                            const isUnanswered = detail.user_answer === null
                            
                            if (isCorrectAnswer) {
                              if (isUnanswered) {
                                // Unanswered questions: highlight correct answer in yellow
                                containerClass = 'border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-500 dark:ring-yellow-600'
                                indicatorClass = 'border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-600 text-white'
                                icon = <CheckCircle size={14} weight="bold" />
                              } else {
                                // Answered correctly: green
                                containerClass = 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500 dark:ring-green-600'
                                indicatorClass = 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-600 text-white'
                                icon = <CheckCircle size={14} weight="bold" />
                              }
                            } else if (isUserAnswer && !detail.is_correct) {
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

                        {questionData?.explanation && (
                          <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                            <div className="flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-400 font-semibold">
                              <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded"><Eye size={16} /></div>
                              Explanation
                            </div>
                            <p className="text-blue-900 dark:text-blue-300 leading-relaxed">{questionData.explanation}</p>
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
                    questions={attempt.details.map((d, i) => ({
                      index: i,
                      status: d.user_answer === null ? 'unanswered' : (d.is_correct ? 'correct' : 'incorrect'),
                      isFlagged: !!d.was_flagged
                    }))}
                    onNavigate={(index) => {
                      const el = document.getElementById(`review-question-${index}`)
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    const currentDetail = attempt.details[currentIndex]
    let currentQuestion: any = null
    for (const set of testData.content.sets) {
      const matchedQ = set.questions.find(q => q.question === currentDetail.question)
      if (matchedQ) {
        currentQuestion = matchedQ
        break
      }
    }

    const hasPassage = currentQuestion?.passage && currentQuestion.passage !== "This question does not have a passage."
    const isCorrect = currentDetail.is_correct

    return (
      <div className="h-full flex flex-col">
        {/* Header - matches test page layout */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-700 px-6 py-4 bg-white dark:bg-slate-800">
          <div className="flex items-center justify-between">
            {/* Left: Test title */}
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{testTitle}</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {attempt.set_name} • {new Date(attempt.completed_at).toLocaleDateString()}
              </p>
            </div>

            {/* Center: Results */}
            <div className="flex-1 flex justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {attempt.score}/{attempt.total_questions}
                </div>
                <div className="text-sm text-gray-500 dark:text-slate-400">
                  {Math.round((attempt.score / attempt.total_questions) * 100)}%
                </div>
              </div>
            </div>

            {/* Right: Time and away clicks */}
            <div className="flex-1 flex items-center justify-end gap-3">
              <div className="flex items-center gap-2 font-mono text-lg font-bold px-3 py-1.5 rounded-lg text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {attempt.time_taken ? `${Math.floor(attempt.time_taken / 60)}:${(attempt.time_taken % 60).toString().padStart(2, '0')}` : '--:--'}
              </div>
              {attempt.away_clicks !== undefined && attempt.away_clicks > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-400 text-xs font-bold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{attempt.away_clicks}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left: Passage */}
          <div className="w-1/2 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-y-auto p-6">
            {hasPassage ? (
              <div>
                <h4 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-4">Passage</h4>
                <div 
                  className="prose prose-blue max-w-none text-gray-800 dark:text-slate-300 leading-relaxed dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: currentQuestion.passage! }} 
                />
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-300 dark:text-slate-600 italic">
                No passage for this question
              </div>
            )}
          </div>

          {/* Floating Navigation - Center between panes (only the navigation button) */}
          <div className="absolute left-1/2 bottom-8 -translate-x-1/2 z-10">
            <button 
              onClick={() => setIsNavOpen(true)}
              className="px-6 py-3 bg-blue-600 dark:bg-purple-600 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-purple-700 font-semibold text-sm shadow-2xl hover:shadow-3xl transition-all border border-blue-500 dark:border-purple-500"
            >
              Question Navigation
            </button>
          </div>

          {/* Right: Question and answers */}
          <div className="w-1/2 bg-gray-50 dark:bg-slate-900 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto pb-32">
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
                    Question {currentIndex + 1} of {attempt.details.length}
                  </span>
                  {currentDetail.was_flagged ? (
                    <div className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-full font-medium">
                      <Flag size={12} weight="fill" />
                      <span>Flagged</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-slate-500 px-3 py-1">
                      <span>Not flagged</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setCurrentIndex(prev => Math.min(attempt.details.length - 1, prev + 1))}
                  disabled={currentIndex === attempt.details.length - 1}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-slate-700 text-white hover:bg-gray-800 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
                >
                  Next <ArrowRight size={14} weight="bold" />
                </button>
              </div>

              {/* Question card */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white leading-relaxed">
                  {currentDetail.question}
                </h2>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion?.options.map((opt: string, idx: number) => {
                  const isUserAnswer = currentDetail.user_answer === opt
                  const isCorrectAnswer = currentDetail.correct_answer === opt
                  const isStruck = currentDetail.strikethroughs?.includes(idx)
                  
                  let containerClass = 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  let indicatorClass = 'border-gray-300 dark:border-slate-600 text-transparent'
                  let icon = <div className="w-2 h-2 bg-current rounded-full" />
                  
                  // Check if question was unanswered
                  const isUnanswered = currentDetail.user_answer === null
                  
                  if (isCorrectAnswer) {
                    if (isUnanswered) {
                      // Unanswered questions: highlight correct answer in yellow
                      containerClass = 'border-yellow-500 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 ring-1 ring-yellow-500 dark:ring-yellow-600'
                      indicatorClass = 'border-yellow-500 dark:border-yellow-600 bg-yellow-500 dark:bg-yellow-600 text-white'
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
                    <div key={idx} className={`p-4 rounded-xl border flex items-center gap-4 ${containerClass}`}>
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

              {/* Explanation */}
              {currentQuestion?.explanation && (
                <div className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-center gap-2 mb-2 text-blue-800 dark:text-blue-400 font-semibold">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded"><Eye size={16} /></div>
                    Explanation
                  </div>
                  <p className="text-blue-900 dark:text-blue-300 leading-relaxed">{currentQuestion.explanation}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Modal */}
        {isNavOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
              onClick={() => setIsNavOpen(false)}
            />
            
            <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 dark:text-white">Question Navigation</h3>
                <button onClick={() => setIsNavOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-gray-500 dark:text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                  {attempt?.details.map((detail, idx) => {
                    const isCurrent = idx === currentIndex
                    const isCorrect = detail.is_correct
                    const wasFlagged = detail.was_flagged
                    const isAnswered = detail.user_answer !== null
                    
                    let bgClass = ''
                    
                    if (!isAnswered) {
                        bgClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
                    } else if (isCorrect) {
                        bgClass = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700'
                    } else {
                        bgClass = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700'
                    }
                    
                    if (isCurrent) {
                      bgClass = 'bg-blue-600 dark:bg-purple-600 text-white border-blue-600 dark:border-purple-600 shadow-md ring-2 ring-blue-200 dark:ring-purple-400'
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentIndex(idx)
                          setIsNavOpen(false)
                        }}
                        className={`aspect-square rounded-lg text-xs font-medium flex items-center justify-center border relative ${bgClass}`}
                      >
                        {idx + 1}
                        {wasFlagged && (
                          <Flag size={16} weight="fill" className="absolute -top-1.5 -right-1.5 text-red-600 dark:text-red-400" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 rounded-b-xl">
                <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-slate-400">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 dark:bg-purple-600 rounded-full"></div> Current</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-full"></div> Correct</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-full"></div> Incorrect</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-full"></div> Unanswered</div>
                  <div className="flex items-center gap-2">
                    <Flag size={12} weight="fill" className="text-red-600 dark:text-red-400" />
                    Flagged
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const headerContent = (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
      <button
        onClick={() => setViewMode('test')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
          viewMode === 'test' 
            ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
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
            ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' 
            : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
        }`}
      >
        <ListBullets size={18} weight={viewMode === 'list' ? 'fill' : 'regular'} />
        List View
      </button>
    </div>
  )

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title={headerContent} maxWidth="max-w-[95vw]" contentClassName="">
      <div className="h-[85vh] flex flex-col">
        {renderContent()}
      </div>
    </BaseModal>
  )
}

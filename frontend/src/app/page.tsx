'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle, Student, Brain, FilePdf, Sun, Moon, Heart } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useTheme } from '@/components/ThemeProvider'

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme()
  const [inputBuffer, setInputBuffer] = useState('')
  const [heartBursts, setHeartBursts] = useState<number[]>([])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setInputBuffer(prev => {
        const newBuffer = (prev + e.key).slice(-4).toLowerCase()
        if (newBuffer === 'gaya') {
          const id = Date.now() + Math.random()
          setHeartBursts(prev => [...prev, id])
          setTimeout(() => {
            setHeartBursts(prev => prev.filter(burstId => burstId !== id))
          }, 5000)
        }
        return newBuffer
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 selection:bg-blue-500/30 transition-colors duration-300">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
                 <Image 
                   src={theme === 'dark' ? "/icon-dark.svg" : "/icon.ico"} 
                   width={32} 
                   height={32} 
                   alt="SelfTest Logo" 
                   className="w-full h-full object-contain"
                 />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                SelfTest
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <Link 
                href="/login?mode=signup" 
                className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm shadow-blue-500/20"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-600/10 dark:bg-blue-600/20 rounded-full blur-[120px] opacity-50" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-[100px] opacity-30" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
                Turn your lecture notes into <br />
                <span className="text-blue-600 dark:text-blue-500">interactive tests</span>&nbsp;instantly.
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Upload your PDFs, PPTs, or notes and let our AI generate comprehensive practice exams. 
                Master your subjects with active recall and spaced&nbsp;repetition.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 group"
                >
                  Sign In
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login?mode=signup"
                  className="w-full sm:w-auto px-8 py-4 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-semibold text-lg transition-all border border-gray-200 dark:border-slate-700"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50 dark:bg-slate-900/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Everything you need to ace your exams</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              SelfTest combines advanced AI with proven learning techniques to help you study smarter, not&nbsp;harder.
            </p>
            <p className="text-slate-500 dark:text-slate-500 max-w-2xl mx-auto mt-4 text-sm italic">
              This project was made for my fiancée. I love you! Write the secret code to find the easter egg&nbsp;❤️
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<FilePdf size={32} className="text-red-500 dark:text-red-400" />}
              title="Upload Any Material"
              description="Support for PDF, PowerPoint, and images. Simply drag and drop your lecture slides or&nbsp;notes."
            />
            <FeatureCard 
              icon={<Brain size={32} className="text-purple-500 dark:text-purple-400" />}
              title="AI-Powered Generation"
              description="Our advanced AI analyzes your content to create relevant, challenging questions that test your understanding."
            />
            <FeatureCard 
              icon={<CheckCircle size={32} className="text-green-500 dark:text-green-400" />}
              title="Track Your Progress"
              description="Monitor your performance over time. Identify weak spots and focus your studying where it matters most."
            />
          </div>
        </div>
      </section>

      {/* Hearts Animation */}
      <AnimatePresence>
        {heartBursts.map((burstId) => (
          <div key={burstId} className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  y: '100vh', 
                  x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                  opacity: 1,
                  scale: 0.5 + Math.random() * 1
                }}
                animate={{ 
                  y: '-10vh',
                  x: (Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000)) + (Math.random() - 0.5) * 200,
                  rotate: Math.random() * 360,
                  opacity: 0
                }}
                transition={{ 
                  duration: 2 + Math.random() * 2, 
                  ease: "easeOut",
                  delay: Math.random() * 0.5
                }}
                className="absolute text-red-500 dark:text-red-400 drop-shadow-lg"
              >
                <Heart weight="fill" size={32 + Math.random() * 32} />
              </motion.div>
            ))}
          </div>
        ))}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center overflow-hidden">
               <Image 
                 src={theme === 'dark' ? "/icon-dark.svg" : "/icon.ico"} 
                 width={24} 
                 height={24} 
                 alt="Logo" 
                 className="w-full h-full object-contain"
               />
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-200">SelfTest</span>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-500">
            © {new Date().getFullYear()} SelfTest. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400">
            <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-2xl hover:shadow-lg dark:hover:bg-slate-800 transition-all duration-300">
      <div className="mb-4 p-3 bg-gray-100 dark:bg-slate-900 rounded-xl w-fit">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { GoogleLogo, EnvelopeSimple, LockKey, ArrowRight, CircleNotch } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/dashboard')
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        alert('Check your email for the confirmation link!')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className={`flex min-h-screen items-center justify-center p-4 transition-colors duration-500 ${isLogin ? 'bg-gradient-to-br from-blue-50 to-indigo-100' : 'bg-gradient-to-br from-purple-50 to-pink-100'}`}>
      <motion.div 
        layout
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <motion.div 
              className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-sm transition-colors duration-300 ${isLogin ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
               <Image src="/icon.ico" width={40} height={40} alt="Logo" className="w-10 h-10" />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login-header' : 'signup-header'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {isLogin ? 'Welcome back' : 'Create account'}
                </h1>
                <p className="text-gray-500">
                  {isLogin ? 'Enter your details to access SelfTest' : 'Start your learning journey today'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="space-y-4 mb-6">
            <button
              onClick={() => handleOAuth('google')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-[#131314] border border-transparent rounded-full text-white font-medium text-[15px] shadow-sm hover:bg-[#131314]/90 hover:shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer group"
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-400 font-medium">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login-form' : 'signup-form'}
                initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Email</label>
                    <div className="relative group">
                      <EnvelopeSimple size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none transition-all ${isLogin ? 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500' : 'focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500'}`}
                        placeholder="student@university.edu"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">Password</label>
                    <div className="relative group">
                      <LockKey size={20} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl outline-none transition-all ${isLogin ? 'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500' : 'focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500'}`}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium border border-red-100"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer ${isLogin ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 focus:ring-blue-500' : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 focus:ring-purple-500'}`}
            >
              {loading ? (
                <>
                  <CircleNotch size={20} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight size={18} weight="bold" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError(null)
                }}
                className={`ml-1.5 font-bold hover:underline focus:outline-none ${isLogin ? 'text-blue-600' : 'text-purple-600'}`}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
      
      <div className="fixed bottom-4 text-xs text-gray-400 font-medium">
        © {new Date().getFullYear()} SelfTest. All rights reserved.
      </div>
    </div>
  )
}


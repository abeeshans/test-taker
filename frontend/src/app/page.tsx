'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { EnvelopeSimple, LockKey, ArrowRight, CircleNotch, ArrowLeft, Check, GoogleLogo, Eye, EyeSlash } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

type AuthMode = 'login' | 'signup' | 'forgot-password'

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkSession()

    // Check for remembered email
    const rememberedEmail = localStorage.getItem('rememberedEmail')
    if (rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }

    // Handle bfcache restoration (back button from Google)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setLoading(false)
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [router, supabase])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        
        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email)
        } else {
          localStorage.removeItem('rememberedEmail')
        }

        router.push('/dashboard')
      } else if (authMode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match")
        }
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          }
        })
        if (error) throw error
        if (data.user && data.user.identities && data.user.identities.length === 0) {
           throw new Error("An account with this email already exists. Please sign in.")
        }
        setSuccessMessage('Account created! Please check your email to confirm your account.')
        setAuthMode('login')
      } else if (authMode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
        })
        if (error) throw error
        setSuccessMessage('Password reset link sent! Check your email.')
        setAuthMode('login')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google') => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  const toggleMode = (mode: AuthMode) => {
    setAuthMode(mode)
    setError(null)
    setSuccessMessage(null)
    setPassword('')
    setConfirmPassword('')
  }

  // Define background colors based on auth mode
  const getGradientColors = () => {
    switch (authMode) {
      case 'signup':
        return {
          top: 'rgba(147, 51, 234, 0.4)', // purple-600
          bottom: 'rgba(236, 72, 153, 0.4)' // pink-500
        }
      case 'forgot-password':
        return {
          top: 'rgba(245, 158, 11, 0.4)', // amber-500
          bottom: 'rgba(234, 88, 12, 0.4)' // orange-600
        }
      case 'login':
      default:
        return {
          top: 'rgba(30, 58, 138, 0.5)', // blue-900
          bottom: 'rgba(49, 46, 129, 0.5)' // indigo-900
        }
    }
  }

  const colors = getGradientColors()

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950 text-slate-200 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <motion.div 
          animate={{ backgroundColor: colors.top }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ backgroundColor: colors.bottom }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" 
        />
      </div>

      <motion.div 
        layout
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-6 md:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={authMode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full"
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-slate-800 border border-slate-700 shadow-sm">
                   <Image src="/icon-dark.svg" width={40} height={40} alt="Logo" className="w-10 h-10" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  {authMode === 'login' ? 'Welcome back' : authMode === 'signup' ? 'Create account' : 'Reset Password'}
                </h1>
                <p className="text-slate-400 text-sm">
                  {authMode === 'login' ? 'Enter your details to access SelfTest' : authMode === 'signup' ? 'Start your learning journey today' : 'Enter your email to receive a reset link'}
                </p>
              </div>

              {authMode !== 'forgot-password' && (
                <>
                  <div className="space-y-4 mb-6">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOAuth('google')}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-slate-900 border border-transparent rounded-lg font-medium text-sm shadow-sm hover:bg-slate-100 transition-all cursor-pointer"
                      disabled={loading}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20px" height="20px">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      <span>Sign in with Google</span>
                    </motion.button>
                  </div>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="px-2 bg-slate-900 text-slate-500">Or continue with</span>
                    </div>
                  </div>
                </>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Email Address</label>
                  <div className="relative group">
                    <EnvelopeSimple size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>
                {authMode !== 'forgot-password' && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5 ml-1">
                      <label className="block text-xs font-medium text-slate-400">Password</label>
                    </div>
                    <div className="relative group">
                      <LockKey size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {authMode === 'login' && (
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${rememberMe ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-slate-600 hover:border-slate-500'}`}
                      >
                        {rememberMe && <Check size={10} weight="bold" />}
                      </button>
                      <label className="ml-2 text-xs text-slate-400 cursor-pointer select-none" onClick={() => setRememberMe(!rememberMe)}>
                        Remember me
                      </label>
                    </div>
                    <button 
                      type="button"
                      onClick={() => toggleMode('forgot-password')}
                      className="text-xs font-medium text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">Confirm Password</label>
                    <div className="relative group">
                      <LockKey size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium text-sm shadow-lg shadow-blue-500/20 transition-all ${
                    authMode === 'signup' 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500' 
                      : authMode === 'forgot-password'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                  }`}
                >
                  {loading ? (
                    <CircleNotch size={20} className="animate-spin mx-auto" />
                  ) : (
                    authMode === 'login' ? 'Sign In' : authMode === 'signup' ? 'Create Account' : 'Send Reset Link'
                  )}
                </motion.button>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-3 rounded-lg bg-red-900/20 text-red-400 text-xs font-medium border border-red-900/30"
                    >
                      {error}
                    </motion.div>
                  )}
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 p-3 rounded-lg bg-green-900/20 text-green-400 text-xs font-medium border border-green-900/30"
                    >
                      {successMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              <div className="mt-6 text-center">
                {authMode === 'forgot-password' ? (
                   <button
                    onClick={() => toggleMode('login')}
                    className="flex items-center justify-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-300 mx-auto transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Back to Sign In
                  </button>
                ) : (
                  <p className="text-sm text-slate-400">
                    {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <button 
                      onClick={() => toggleMode(authMode === 'login' ? 'signup' : 'login')}
                      className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors"
                    >
                      {authMode === 'login' ? 'Sign up' : 'Log in'}
                    </button>
                  </p>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
      
      <div className="fixed bottom-4 flex gap-4 text-xs text-slate-600 font-medium">
        <span>© {new Date().getFullYear()} SelfTest. All rights reserved.</span>
        <a href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
      </div>
    </div>
  )
}

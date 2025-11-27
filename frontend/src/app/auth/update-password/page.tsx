'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { LockKey, CircleNotch, ArrowRight } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // If no session, they might have lost it or clicked the link in a different browser
        // We can't update password without session.
        // Redirect to login with error? Or show error.
        setError("Invalid or expired session. Please request a new password reset link.")
      }
    }
    checkSession()
  }, [supabase])

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-950 text-slate-200 relative overflow-hidden">
      {/* Subtle background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8 z-10"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-slate-800 border border-slate-700 shadow-sm">
            <Image src="/icon-dark.svg" width={40} height={40} alt="Logo" className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Update Password</h1>
          <p className="text-slate-400 text-sm">Enter your new password below.</p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 ml-1">New Password</label>
              <div className="relative group">
                <LockKey size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
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
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-lg bg-red-900/20 text-red-400 text-xs font-medium border border-red-900/30"
              >
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-lg bg-green-900/20 text-green-400 text-xs font-medium border border-green-900/30"
              >
                Password updated! Redirecting...
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-lg shadow-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <CircleNotch size={18} className="animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <span>Update Password</span>
                <ArrowRight size={16} weight="bold" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

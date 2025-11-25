'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, CircleNotch } from '@phosphor-icons/react'
import { supabase } from '@/lib/supabase'

export default function AuthCodeError() {
  const router = useRouter()
  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthResponse = async () => {
      try {
        // Check if we have tokens in the hash (PKCE flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          // Set the session in Supabase
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (sessionError) {
            console.error('Session error:', sessionError)
            setError(sessionError.message)
            setProcessing(false)
            return
          }

          // Session set successfully, redirect to dashboard
          console.log('OAuth succeeded, redirecting to dashboard...')
          router.push('/dashboard')
          return
        }

        // No tokens found, show error
        setError('No authentication tokens found')
        setProcessing(false)
      } catch (err: any) {
        console.error('Auth error:', err)
        setError(err.message || 'An error occurred')
        setProcessing(false)
      }
    }

    handleAuthResponse()
  }, [router])

  if (processing) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
          <CircleNotch size={64} className="text-blue-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Completing Sign In...
          </h1>
          <p className="text-gray-600">
            Please wait while we log you in
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-red-50 to-orange-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <XCircle size={64} className="text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Authentication Error
        </h1>
        <p className="text-gray-600 mb-2">
          There was a problem signing you in.
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-6 font-mono bg-red-50 p-3 rounded">
            {error}
          </p>
        )}
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Return to Sign In
        </button>
      </div>
    </div>
  )
}

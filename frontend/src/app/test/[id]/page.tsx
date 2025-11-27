'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import TestTaker from '@/components/TestTaker'
import { API_URL } from '@/lib/api'

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [testData, setTestData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const timeLimit = searchParams.get('time') ? parseInt(searchParams.get('time') as string) : null

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/')
          return
        }

        const res = await fetch(`${API_URL}/tests/${params.id}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })

        if (!res.ok) {
          throw new Error('Failed to load test')
        }

        const data = await res.json()
        setTestData(data)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchTest()
    }
  }, [params.id, router])

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">Loading test...</div>
  if (error) return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 text-red-600 dark:text-red-400">{error}</div>
  if (!testData) return null

  return <TestTaker testId={params.id as string} initialData={testData} timeLimit={timeLimit} />
}

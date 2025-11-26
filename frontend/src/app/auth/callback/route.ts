import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Always prefer the configured site URL in production
      let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
      
      // Fix for 0.0.0.0 redirect issue
      if (siteUrl.includes('0.0.0.0')) {
        console.warn('Redirect URL contains 0.0.0.0, this will likely fail on client side. Please set NEXT_PUBLIC_SITE_URL.')
        // If we are on 0.0.0.0, we can't really guess the real domain without config.
        // But we can try to fallback to something else if needed, or just log it.
      }

      return NextResponse.redirect(`${siteUrl}${next}`)
    } else {
        console.error('Auth code exchange error:', error)
    }
  }

  // return the user to an error page with instructions
  let siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
  if (siteUrl.includes('0.0.0.0')) {
      console.warn('Redirect URL contains 0.0.0.0. Please set NEXT_PUBLIC_SITE_URL.')
  }
  return NextResponse.redirect(`${siteUrl}/auth/auth-code-error`)
}

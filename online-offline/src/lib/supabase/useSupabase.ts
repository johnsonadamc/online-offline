'use client'
import { useState } from 'react'
import { getSupabaseClient } from './client'

export function useSupabase() {
  const [supabase] = useState(() => {
    if (typeof document === 'undefined') {
      return getSupabaseClient()
    }
    const cookieValue = document.cookie
      .split('; ')
      .find(r => r.startsWith('sb-cbdiujvqpirrvzodfujm-auth-token='))
      ?.split('=')
      .slice(1)
      .join('=')

    let token: string | undefined
    try {
      const session = JSON.parse(decodeURIComponent(cookieValue || ''))
      token = Array.isArray(session) ? session[0] : session?.access_token
    } catch {}

    return getSupabaseClient(token)
  })
  return supabase
}

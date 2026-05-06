'use client'
import { useState } from 'react'
import { getSupabaseClient } from './client'

export function useSupabase() {
  const [supabase] = useState(() => {
    if (typeof document === 'undefined') {
      return getSupabaseClient()
    }
    const token = document.cookie
      .split('; ')
      .find(r => r.startsWith('sb-access-token='))
      ?.split('=')[1]
    return getSupabaseClient(token)
  })
  return supabase
}

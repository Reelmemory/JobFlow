'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'
import { fetchJson, type FetchJsonInit } from '@/lib/fetch-json'

export function useAuthedJson() {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const request = useCallback(
    async <T,>(url: string, init?: FetchJsonInit) => {
      const token = await getToken()
      return fetchJson<T>(url, { ...init, token })
    },
    [getToken],
  )

  return { request, isLoaded, isSignedIn }
}

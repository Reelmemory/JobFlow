export type FetchJsonInit = RequestInit & {
  token?: string | null
}

export async function fetchJson<T>(
  url: string,
  init?: FetchJsonInit,
): Promise<{
  ok: boolean
  status: number
  data: T | null
  error: string | null
}> {
  try {
    const { token, headers: initHeaders, ...rest } = init || {}
    const headers = new Headers(initHeaders)
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const res = await fetch(url, {
      ...rest,
      headers,
      credentials: 'include',
      cache: rest.cache ?? 'no-store',
    })
    const raw = await res.text()
    if (!raw) {
      return {
        ok: false,
        status: res.status,
        data: null,
        error:
          res.status === 401
            ? 'Please sign in again.'
            : 'Empty response from server.',
      }
    }
    let data: T
    try {
      data = JSON.parse(raw) as T
    } catch {
      return { ok: false, status: res.status, data: null, error: 'Invalid JSON from server.' }
    }
    const errObj = data as { error?: string }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: errObj.error || `Request failed (${res.status})`,
      }
    }
    return { ok: true, status: res.status, data, error: null }
  } catch {
    return { ok: false, status: 0, data: null, error: 'Network error.' }
  }
}

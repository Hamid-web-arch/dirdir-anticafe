import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, apiEnabled } from '../lib/api.js'

const TOKEN_KEY = 'dirdir.token'

// localStorage gizli rejimdə və ya bloklananda xəta ata bilər — sayt yenə də işləməlidir.
const storage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set: (v) => {
    try {
      v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY)
    } catch {}
  },
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => (apiEnabled ? storage.get() : null))
  const [user, setUser] = useState(null)
  // Saxlanmış token varsa, profili yükləyənə qədər "yoxlanılır" vəziyyətindəyik.
  const [checking, setChecking] = useState(Boolean(token))

  const saveSession = useCallback(({ token: t, user: u }) => {
    storage.set(t)
    setToken(t)
    setUser(u)
  }, [])

  const logout = useCallback(() => {
    storage.set(null)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!token || user) return
    let cancelled = false
    api('/auth/me', { token })
      .then(({ user: u }) => !cancelled && setUser(u))
      .catch((err) => {
        // Yalnız token etibarsızdırsa çıxırıq; şəbəkə xətasında sessiyanı saxlayırıq.
        if (!cancelled && err.status === 401) logout()
      })
      .finally(() => !cancelled && setChecking(false))
    return () => {
      cancelled = true
    }
  }, [token, user, logout])

  const value = useMemo(
    () => ({
      user,
      token,
      checking,
      login: async (credentials) => saveSession(await api('/auth/login', { method: 'POST', body: credentials })),
      register: async (data) => saveSession(await api('/auth/register', { method: 'POST', body: data })),
      logout,
    }),
    [user, token, checking, saveSession, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

import { useEffect, useRef, useState } from 'react'
import { api, apiEnabled } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import { useI18n } from '../i18n/index.jsx'
import { useTheme } from '../theme/ThemeContext.jsx'
import { FormError } from './AuthLayout.jsx'

// "Google ilə davam et" (Google Identity Services). Düyməni Google özü çəkir; basanda Google pəncərəsi açılır,
// müştəri hesabını seçir və Google imzalı token qaytarır — server onu yoxlayıb hesabı tapır və ya yaradır.
// Client ID: VITE_GOOGLE_CLIENT_ID və ya serverdən (/auth/google/config). Yoxdursa düymə göstərilmir.
const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
let scriptPromise = null
const loadScript = () => {
  scriptPromise ??= new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = SCRIPT_SRC
    el.async = true
    el.onload = () => resolve(window.google)
    el.onerror = () => {
      scriptPromise = null
      reject(new Error('Google script failed'))
    }
    document.head.appendChild(el)
  })
  return scriptPromise
}

let clientIdPromise = null
const loadClientId = () => {
  const fromEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (fromEnv) return Promise.resolve(fromEnv)
  if (!apiEnabled) return Promise.resolve(null)
  clientIdPromise ??= api('/auth/google/config')
    .then((d) => d.clientId)
    .catch(() => {
      clientIdPromise = null
      return null
    })
  return clientIdPromise
}

export default function GoogleButton({ newsletter = false }) {
  const { lang, t, errorText } = useI18n()
  const { theme } = useTheme()
  const { loginWithGoogle } = useAuth()
  const box = useRef(null)
  const [clientId, setClientId] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  // Ən son newsletter seçimi Google cavabı gələndə də istifadə olunsun
  const newsletterRef = useRef(newsletter)
  newsletterRef.current = newsletter

  useEffect(() => {
    let cancelled = false
    loadClientId().then((id) => !cancelled && setClientId(id))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!clientId || !box.current) return
    let cancelled = false
    loadScript()
      .then((google) => {
        if (cancelled || !box.current) return
        google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: 'popup',
          callback: async ({ credential }) => {
            setError(null)
            setBusy(true)
            try {
              await loginWithGoogle({ credential, newsletter: newsletterRef.current }) // yönləndirmə səhifənin özündədir
            } catch (err) {
              setError(err)
            } finally {
              setBusy(false)
            }
          },
        })
        box.current.innerHTML = ''
        google.accounts.id.renderButton(box.current, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          width: Math.min(400, Math.max(200, box.current.offsetWidth)),
          locale: lang,
        })
      })
      .catch(() => !cancelled && setError({ code: 'GOOGLE_INVALID' }))
    return () => {
      cancelled = true
    }
  }, [clientId, lang, theme, loginWithGoogle])

  if (!clientId) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-[0.8rem] font-semibold text-inkdim">
        <span className="h-px flex-1 bg-ink/10" />
        {t('auth.or')}
        <span className="h-px flex-1 bg-ink/10" />
      </div>
      <div ref={box} className={`w-full min-h-[44px] flex justify-center ${busy ? 'opacity-60 pointer-events-none' : ''}`} />
      {error && <FormError>{errorText(error)}</FormError>}
    </div>
  )
}

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { PiTrashBold } from 'react-icons/pi'
import { useI18n } from '../i18n/index.jsx'

// Silmədən əvvəl "Silmək istədiyinizə əminsinizmi?" pəncərəsi.
// İstifadə: const confirm = useConfirm(); if (await confirm({ detail: 'Oyun silinəcək.' })) { ...sil... }
const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const { t } = useI18n()
  const [ask, setAsk] = useState(null) // { title, detail, yes, resolve }
  const cancelRef = useRef(null)

  const confirm = useCallback(
    (options = {}) =>
      new Promise((resolve) => {
        setAsk((prev) => {
          prev?.resolve(false) // köhnə sual açıq qalıbsa, ləğv olunur
          return { ...options, resolve }
        })
      }),
    [],
  )

  const close = useCallback((answer) => {
    setAsk((prev) => {
      prev?.resolve(answer)
      return null
    })
  }, [])

  useEffect(() => {
    if (!ask) return
    cancelRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && close(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [ask, close])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {ask && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-night/60 backdrop-blur-sm" onClick={() => close(false)} />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-[400px] bg-card text-ink rounded-[24px] shadow-lift px-6 py-7 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-brand-pink-soft text-brand-pink-deep flex items-center justify-center">
              <PiTrashBold size={26} />
            </div>
            <p id="confirm-title" className="font-display font-bold text-[1.2rem] leading-snug">
              {ask.title ?? t('confirm.title')}
            </p>
            {ask.detail && <p className="text-inkdim text-[0.9rem] mt-2">{ask.detail}</p>}
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => close(false)}
                className="px-4 py-3 rounded-full font-bold border-2 border-ink/15 hover:border-ink transition-colors"
              >
                {t('confirm.cancel')}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className="px-4 py-3 rounded-full font-bold bg-brand-pink-deep text-card hover:opacity-90 transition-opacity"
              >
                {ask.yes ?? t('confirm.yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, apiEnabled } from '../lib/api.js'
import { business } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'

// Qiymətlər admin paneldən dəyişir və serverdən gəlir (/api/pricing).
// Server cavab verənə qədər son görülən qiymətlər (brauzerdə saxlanmış), o da yoxdursa business.js-dəki standart cədvəl.
const CACHE_KEY = 'dirdir.pricing'

const cache = {
  get: () => {
    try {
      const value = JSON.parse(localStorage.getItem(CACHE_KEY))
      return value?.hall && value?.room && value?.studentDiscount ? value : null
    } catch {
      return null
    }
  },
  set: (value) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(value))
    } catch {}
  },
}

const PricingContext = createContext(business.pricing)
const PricingUpdateContext = createContext(() => {})

export function PricingProvider({ children }) {
  const [pricing, setPricing] = useState(() => (apiEnabled && cache.get()) || business.pricing)

  useEffect(() => {
    if (!apiEnabled) return
    let cancelled = false
    api('/pricing')
      .then(({ pricing: p }) => {
        if (cancelled) return
        setPricing(p)
        cache.set(p)
      })
      .catch(() => {}) // server əlçatmazdırsa, olan qiymətlər qalır
    return () => {
      cancelled = true
    }
  }, [])

  // Brauzer tabındakı başlıqda ilk saatın qiyməti var
  const { t } = useI18n()
  const titlePrice = `${pricing.hall.firstHour}${business.currency}`
  useEffect(() => {
    document.title = t('pageTitle', { price: titlePrice })
  }, [t, titlePrice])

  // Admin qiymətləri saxlayanda sayt dərhal yeni qiymətləri göstərsin
  const update = useCallback((p) => {
    setPricing(p)
    cache.set(p)
  }, [])

  return (
    <PricingUpdateContext.Provider value={update}>
      <PricingContext.Provider value={pricing}>{children}</PricingContext.Provider>
    </PricingUpdateContext.Provider>
  )
}

// { hall, room, studentDiscount } — business.js-dəki pricing ilə eyni forma
export const usePricing = () => useContext(PricingContext)
export const usePricingUpdate = () => useContext(PricingUpdateContext)

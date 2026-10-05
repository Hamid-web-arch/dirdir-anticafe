import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Scrolls to the top on every route change, except when landing on a hash (e.g. /#about).
export default function ScrollToTop() {
  // key hər klikdə dəyişir — eyni linkə ikinci dəfə basanda da bölməyə qayıdır.
  const { pathname, hash, key } = useLocation()

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1)
      const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' })
      scroll()
      const timers = [100, 300, 700].map((ms) => setTimeout(scroll, ms))
      return () => timers.forEach(clearTimeout)
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, hash, key])

  return null
}

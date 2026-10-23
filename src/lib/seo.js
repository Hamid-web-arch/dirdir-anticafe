// Axtarış sistemləri üçün: hər səhifənin başlığı, təsviri, kanonik ünvanı və sosial şəbəkə önizləməsi.
// Saytın əsas ünvanı .env.production-dakı VITE_SITE_URL-dən gəlir (öz domen qoşulanda yalnız orada dəyiş).
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const SITE_URL = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, '')
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

// useSeo({ title, description }) — title boşdursa (məs. məlumat hələ yüklənir) heç nə dəyişmir.
// noindex: giriş, hesab, admin kimi səhifələr Google-da görünməsin.
export function useSeo({ title, description, image, noindex = false }) {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!title) return
    const url = `${SITE_URL}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`
    document.title = title
    setCanonical(url)
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:url', url)
    setMeta('property', 'og:image', image || DEFAULT_IMAGE)
    setMeta('name', 'twitter:title', title)
    if (description) {
      setMeta('name', 'description', description)
      setMeta('property', 'og:description', description)
      setMeta('name', 'twitter:description', description)
    }
  }, [title, description, image, noindex, pathname])
}

// "Oyun adı" → "Oyun adı — DırDır Anticafe"
export const pageTitle = (name) => (name ? `${name} — DırDır Anticafe` : '')

// Uzun mətndən meta təsviri üçün ~155 simvol
export const excerpt = (text, max = 155) => {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : clean
}

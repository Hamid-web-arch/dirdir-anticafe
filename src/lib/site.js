import { useEffect, useState } from 'react'
import { api, apiEnabled, assetUrl } from './api.js'

// Admin paneldən dəyişən sayt məzmunu: şəkillər (giriş / qeydiyyat) və ana səhifənin fon videosu.
// Bir dəfə yüklənir, səhifələr arasında yaddaşda qalır.
let cache = null // { images, heroVideo }
let pending = null
const listeners = new Set()

function load() {
  pending ??= api('/site')
    .then((site) => (cache = { images: site.images ?? {}, heroVideo: site.heroVideo ?? null }))
    .catch(() => (cache = { images: {}, heroVideo: null }))
  return pending
}

function update(next) {
  cache = { ...(cache ?? { images: {}, heroVideo: null }), ...next }
  pending = Promise.resolve(cache)
  listeners.forEach((fn) => fn(cache))
}

// Admin şəkli / videonu dəyişəndə sayt dərhal yenisini göstərsin
export const setSiteImagesCache = (images) => update({ images })
export const setHeroVideoCache = (heroVideo) => update({ heroVideo })

function useSite() {
  const [site, setSite] = useState(cache)
  useEffect(() => {
    listeners.add(setSite)
    if (apiEnabled && !cache) {
      load().then((s) => setSite(s))
    }
    return () => listeners.delete(setSite)
  }, [])
  return site
}

// key: 'login' | 'register' → şəklin tam ünvanı və ya null (standart şəkil göstərilir)
export function useSiteImage(key) {
  const url = useSite()?.images?.[key]
  return url ? assetUrl(url) : null
}

// Ana səhifənin fon videosu: tam ünvan və ya null (video yoxdur — sadə fon)
export function useHeroVideo() {
  const url = useSite()?.heroVideo
  return url ? assetUrl(url) : null
}

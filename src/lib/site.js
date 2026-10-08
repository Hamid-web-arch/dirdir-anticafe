import { useEffect, useState } from 'react'
import { api, apiEnabled, assetUrl } from './api.js'

// Admin paneldən dəyişən sayt şəkilləri (giriş / qeydiyyat). Bir dəfə yüklənir, səhifələr arasında yaddaşda qalır.
let cache = null
let pending = null

function load() {
  pending ??= api('/site')
    .then(({ images }) => (cache = images))
    .catch(() => (cache = {}))
  return pending
}

// Admin şəkli dəyişəndə sayt dərhal yenisini göstərsin
export function setSiteImagesCache(images) {
  cache = images
  pending = Promise.resolve(images)
}

// key: 'login' | 'register' → şəklin tam ünvanı və ya null (standart şəkil göstərilir)
export function useSiteImage(key) {
  const [images, setImages] = useState(cache)
  useEffect(() => {
    if (!apiEnabled || cache) return
    let alive = true
    load().then((i) => alive && setImages(i))
    return () => {
      alive = false
    }
  }, [])
  const url = images?.[key]
  return url ? assetUrl(url) : null
}

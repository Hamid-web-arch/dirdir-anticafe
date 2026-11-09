import { prisma } from './db.js'
import { imageUrl } from './images.js'
import { SITE_IMAGE_KEYS } from './validation.js'
import { videoUrl } from './videos.js'

// Ana səhifənin fon videosu: AppSetting "video.hero" = videonun id-si
export const HERO_VIDEO_KEY = 'video.hero'

export async function getHeroVideo() {
  const row = await prisma.appSetting.findUnique({ where: { key: HERO_VIDEO_KEY } })
  return videoUrl(row?.value ?? null)
}

// Saytın admin paneldən dəyişən şəkilləri (giriş / qeydiyyat səhifələri). AppSetting-də "image.<açar>" = şəklin id-si.
export const siteImageSettingKey = (key) => `image.${key}`

export async function getSiteImages() {
  const rows = await prisma.appSetting.findMany({
    where: { key: { in: SITE_IMAGE_KEYS.map(siteImageSettingKey) } },
  })
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  // Şəkil qoyulmayıbsa null — sayt öz standart şəklini göstərir
  return Object.fromEntries(SITE_IMAGE_KEYS.map((k) => [k, imageUrl(byKey[siteImageSettingKey(k)] ?? null)]))
}

import { prisma } from './db.js'
import { imageUrl } from './images.js'
import { SITE_IMAGE_KEYS } from './validation.js'

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

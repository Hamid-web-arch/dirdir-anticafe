import { randomInt } from 'node:crypto'
import { z } from 'zod'
import { prisma } from './db.js'

// Hədiyyə çarxının ayarları bazada (AppSetting "wheel") saxlanır və admin paneldən dəyişir.
// periodDays — bir istifadəçi neçə gündə bir dəfə fırlada bilər; chance — hədiyyənin düşmə şansı (nisbi çəki).
// Bu standart siyahı nümunədir — kafe sahibi admin paneldə öz hədiyyələrini yazır.
export const DEFAULT_WHEEL = {
  enabled: true,
  periodDays: 7,
  prizes: [
    { label: { az: '10% endirim', en: '10% off', ru: 'Скидка 10%' }, chance: 30 },
    { label: { az: 'Pulsuz 30 dəq', en: 'Free 30 min', ru: '30 мин бесплатно' }, chance: 20 },
    { label: { az: '15% endirim', en: '15% off', ru: 'Скидка 15%' }, chance: 20 },
    { label: { az: '20% endirim', en: '20% off', ru: 'Скидка 20%' }, chance: 15 },
    { label: { az: 'Pulsuz 1 saat', en: 'Free 1 hour', ru: '1 час бесплатно' }, chance: 10 },
    { label: { az: 'Kino 25% endirim', en: 'Cinema 25% off', ru: 'Кино −25%' }, chance: 5 },
  ],
}

const SETTING_KEY = 'wheel'

const optionalText = z.string().trim().max(24, 'Ən çox 24 simvol — çarxa sığsın.').default('')

const prizeSchema = z.object({
  label: z.object({
    az: z.string({ error: 'Hədiyyənin adını yaz.' }).trim().min(1, 'Hədiyyənin adını yaz.').max(24, 'Ən çox 24 simvol — çarxa sığsın.'),
    en: optionalText,
    ru: optionalText,
  }),
  chance: z
    .number({ error: 'Şansı yaz.' })
    .int('Şans tam ədəd olmalıdır.')
    .min(1, 'Şans ən az 1 ola bilər.')
    .max(1000, 'Şans ən çox 1000 ola bilər.'),
})

export const wheelSchema = z.object({
  enabled: z.boolean(),
  periodDays: z
    .number({ error: 'Gün sayını yaz.' })
    .int('Gün sayı tam ədəd olmalıdır.')
    .min(1, 'Ən az 1 gün.')
    .max(365, 'Ən çox 365 gün.'),
  prizes: z.array(prizeSchema).min(2, 'Çarxda ən az 2 hədiyyə olmalıdır.').max(10, 'Çarxda ən çox 10 hədiyyə ola bilər.'),
})

export async function getWheel(db = prisma) {
  const row = await db.appSetting.findUnique({ where: { key: SETTING_KEY } })
  if (!row) return DEFAULT_WHEEL
  try {
    const parsed = wheelSchema.safeParse(JSON.parse(row.value))
    if (parsed.success) return parsed.data
  } catch {}
  return DEFAULT_WHEEL
}

export async function saveWheel(input) {
  const wheel = wheelSchema.parse(input)
  const value = JSON.stringify(wheel)
  await prisma.appSetting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value }, update: { value } })
  return wheel
}

// Şansa görə hədiyyə seçir (kriptoqrafik təsadüf — nəticəni təxmin etmək olmasın)
export function drawPrize(prizes) {
  const total = prizes.reduce((sum, p) => sum + p.chance, 0)
  let roll = randomInt(total)
  for (let i = 0; i < prizes.length; i++) {
    roll -= prizes[i].chance
    if (roll < 0) return i
  }
  return prizes.length - 1
}

// Növbəti fırlatma vaxtı: son fırlatmadan periodDays gün sonra (keçibsə — null, indi fırlada bilər)
export function nextSpinAt(lastSpinAt, periodDays, now = new Date()) {
  if (!lastSpinAt) return null
  const next = new Date(lastSpinAt.getTime() + periodDays * 24 * 60 * 60 * 1000)
  return next > now ? next : null
}

// Saytda göstərilən çarx — şanslar göstərilmir
export const publicPrizes = (wheel) => wheel.prizes.map((p) => ({ label: p.label }))

export const publicSpin = (s) => ({ id: s.id, prize: s.prize, createdAt: s.createdAt, usedAt: s.usedAt })

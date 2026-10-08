import { z } from 'zod'
import { prisma } from './db.js'

// Qiymətlər bazada (AppSetting "pricing") saxlanır və admin paneldən dəyişir.
// Admin heç nə saxlamayıbsa, bu standart cədvəl işləyir (Instagram "Qiymət" story-si).
export const DEFAULT_PRICING = {
  // Ümumi zal: ilk saat + sonrakı hər saat; bir nəfər stop çekdən artıq ödəmir.
  hall: { firstHour: 4, nextHour: 3, cap: 13 },
  // Kino otağı: smallGroup.maxPeople nəfərə qədər ilk saat/sonrakı saat;
  // daha çox — saatı perHour, includedPeople nəfərdən sonra hər əlavə nəfər saatda +extraPerPerson.
  room: {
    maxPeople: 8,
    smallGroup: { maxPeople: 2, firstHour: 15, nextHour: 10 },
    group: { perHour: 20, includedPeople: 5, extraPerPerson: 2 },
  },
  // Tələbə endirimi (yalnız zalda): minHours saat və daha çox qalanda percent faiz.
  studentDiscount: { percent: 20, minHours: 3 },
}

const SETTING_KEY = 'pricing'

const price = (label) =>
  z
    .number({ error: `${label} yaz.` })
    .positive(`${label} 0-dan böyük olmalıdır.`)
    .max(1000, `${label} ən çox 1000 ola bilər.`)
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Ən çox 2 onluq rəqəm (məs. 4.50).')

const people = (label, min, max) =>
  z
    .number({ error: `${label} yaz.` })
    .int(`${label} tam ədəd olmalıdır.`)
    .min(min, `${label} ən az ${min} ola bilər.`)
    .max(max, `${label} ən çox ${max} ola bilər.`)

export const pricingSchema = z
  .object({
    hall: z.object({
      firstHour: price('İlk saatın qiyməti'),
      nextHour: price('Sonrakı saatın qiyməti'),
      cap: price('Stop çek'),
    }),
    room: z.object({
      maxPeople: people('Otağın tutumu', 2, 30),
      smallGroup: z.object({
        maxPeople: people('Kiçik qrup', 1, 29),
        firstHour: price('İlk saatın qiyməti'),
        nextHour: price('Sonrakı saatın qiyməti'),
      }),
      group: z.object({
        perHour: price('Saatlıq qiymət'),
        includedPeople: people('Qiymətə daxil olan nəfər', 2, 30),
        extraPerPerson: z
          .number({ error: 'Əlavə nəfər qiymətini yaz.' })
          .min(0, 'Mənfi ola bilməz.')
          .max(1000),
      }),
    }),
    studentDiscount: z.object({
      percent: people('Endirim faizi', 0, 100),
      minHours: z
        .number({ error: 'Minimum saatı yaz.' })
        .min(0)
        .max(12)
        .refine((n) => Number.isInteger(n * 2), 'Yarım saatlıq addımla yaz (məs. 2.5).'),
    }),
  })
  .superRefine((p, ctx) => {
    if (p.hall.cap < p.hall.firstHour) {
      ctx.addIssue({ code: 'custom', path: ['hall', 'cap'], message: 'Stop çek ilk saatın qiymətindən az ola bilməz.' })
    }
    if (p.room.smallGroup.maxPeople >= p.room.maxPeople) {
      ctx.addIssue({
        code: 'custom',
        path: ['room', 'smallGroup', 'maxPeople'],
        message: 'Kiçik qrup otağın tutumundan az olmalıdır.',
      })
    }
    const { includedPeople } = p.room.group
    if (includedPeople <= p.room.smallGroup.maxPeople || includedPeople > p.room.maxPeople) {
      ctx.addIssue({
        code: 'custom',
        path: ['room', 'group', 'includedPeople'],
        message: 'Kiçik qrupdan çox, otağın tutumundan çox olmamalıdır.',
      })
    }
  })

export async function getPricing(db = prisma) {
  const row = await db.appSetting.findUnique({ where: { key: SETTING_KEY } })
  if (!row) return DEFAULT_PRICING
  // Köhnə/zədəli qeyd saytı sındırmasın — standart cədvələ qayıdırıq.
  try {
    const parsed = pricingSchema.safeParse(JSON.parse(row.value))
    if (parsed.success) return parsed.data
  } catch {}
  return DEFAULT_PRICING
}

export async function savePricing(input) {
  const pricing = pricingSchema.parse(input)
  const value = JSON.stringify(pricing)
  await prisma.appSetting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value }, update: { value } })
  return pricing
}

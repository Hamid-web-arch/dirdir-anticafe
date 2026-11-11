import { z } from 'zod'
import { prisma } from './db.js'
import { bakuDay } from './visits.js'

// DırDır Club — status (loyallıq) sistemi. Ayarlar bazada (AppSetting "club") saxlanır və admin paneldən dəyişir.
// Status son `months` ayda neçə FƏRQLİ gün ödənişli ziyarət olduğuna görə hesablanır (Günün hesabatındakı bitmiş seanslar).
// Bir gündə bir neçə dəfə gəlmək — 1 ziyarət; pulsuz (0 ₼) seans — sayılmır; startDay-dən əvvəlki ziyarətlər — sayılmır.
// Status saxlanmır, hər dəfə ziyarətlərdən hesablanır — ona görə həmişə günün vəziyyətini göstərir.

const text = (az, en = '', ru = '') => ({ az, en, ru })

export const DEFAULT_CLUB = {
  enabled: true,
  months: 6, // statusun hesablandığı müddət
  maxPercent: 20, // status endiriminin ən yüksək faizi
  combine: 'max', // max — digər endirimlərlə cəmlənmir (ən böyüyü); stack — üstünə gəlir
  group: false, // zalda status endirimi: false — yalnız müştərinin öz payına, true — bütün qrupa
  tiers: [
    {
      key: 'tanish',
      name: text('Tanış', 'Acquaintance', 'Знакомый'),
      icon: '👋',
      color: 'teal',
      minVisits: 0,
      hallPercent: 5,
      roomPercent: 5,
      benefits: [text('Ad günü üstünlüyü'), text('Dost dəvəti və xüsusi kampaniyalarda iştirak')],
      gifts: [],
    },
    {
      key: 'qonaq',
      name: text('Qonaq', 'Guest', 'Гость'),
      icon: '☕',
      color: 'purple',
      minVisits: 9,
      hallPercent: 10,
      roomPercent: 10,
      benefits: [
        text('Tanış statusunun bütün üstünlükləri'),
        text('Ad günü üstünlüyü'),
        text('Xüsusi oyun günləri və masterclass-lara erkən qeydiyyat'),
        text('Xüsusi kampaniyalara çıxış'),
      ],
      gifts: [],
    },
    {
      key: 'sakin',
      name: text('Sakin', 'Resident', 'Завсегдатай'),
      icon: '🛋️',
      color: 'orange',
      minVisits: 15,
      hallPercent: 15,
      roomPercent: 15,
      benefits: [
        text('Qonaq statusunun bütün üstünlükləri'),
        text('Ləğv olunan kino otağı rezervlərindən 1 saatı hədiyyə kimi götürmək imkanı'),
        text('Xüsusi tədbir və kampaniyalara erkən giriş'),
      ],
      gifts: [text('1 saatlıq ümumi zal hədiyyəsi'), text('Ad günü üçün tort — DırDır-dan hədiyyə')],
    },
    {
      key: 'ev-sahibi',
      name: text('Ev sahibi', 'Host', 'Хозяин'),
      icon: '🏠',
      color: 'pink',
      minVisits: 25,
      hallPercent: 20,
      roomPercent: 20,
      benefits: [
        text('Sakin statusunun bütün üstünlükləri'),
        text('Ləğv olunan rezervlər barədə hamıdan əvvəl xəbər'),
        text('Boşalan rezerv saatı 50% endirimlə'),
        text('Xüsusi tədbirlərə dəvət'),
        text('Yeni xidmət və oyunları ilk sınamaq hüququ'),
      ],
      gifts: [text('Hər ay 1 dəfə: 2 nəfərlik kino otağı, 2 saat pulsuz'), text('Xüsusi ad günü hədiyyəsi')],
    },
  ],
}

export const TIER_COLORS = ['teal', 'purple', 'orange', 'pink', 'yellow', 'cyan']

const SETTING_KEY = 'club'

const localized = (label, max) =>
  z.object({
    az: z.string({ error: `${label} yaz.` }).trim().min(1, `${label} yaz.`).max(max, `Ən çox ${max} simvol.`),
    en: z.string().trim().max(max, `Ən çox ${max} simvol.`).default(''),
    ru: z.string().trim().max(max, `Ən çox ${max} simvol.`).default(''),
  })

const percent = (label) =>
  z.number({ error: `${label} yaz.` }).int(`${label} tam ədəd olmalıdır.`).min(0, 'Mənfi ola bilməz.').max(100, 'Ən çox 100.')

const tierSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Açar yalnız kiçik latın hərfləri, rəqəm və "-" ola bilər.'),
  name: localized('Statusun adını', 30),
  icon: z.string().trim().min(1, 'İkon seç.').max(8),
  color: z.enum(TIER_COLORS),
  minVisits: z.number({ error: 'Ziyarət həddini yaz.' }).int('Tam ədəd olmalıdır.').min(0).max(1000),
  hallPercent: percent('Zal endirimini'),
  roomPercent: percent('Kino otağı endirimini'),
  benefits: z.array(localized('Üstünlüyü', 160)).max(20, 'Ən çox 20 üstünlük.'),
  gifts: z.array(localized('Hədiyyəni', 160)).max(20, 'Ən çox 20 hədiyyə.'),
})

export const clubSchema = z
  .object({
    enabled: z.boolean(),
    months: z.number({ error: 'Ay sayını yaz.' }).int().min(1, 'Ən az 1 ay.').max(24, 'Ən çox 24 ay.'),
    maxPercent: percent('Maksimum endirimi'),
    combine: z.enum(['max', 'stack']),
    group: z.boolean(),
    // Ziyarətlər bu gündən sayılır (Club işə düşən gün). Admin dəyişə bilər.
    startDay: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarix düzgün deyil.'),
    tiers: z.array(tierSchema).min(2, 'Ən az 2 status olmalıdır.').max(8, 'Ən çox 8 status ola bilər.'),
  })
  .superRefine((club, ctx) => {
    const tiers = club.tiers
    if (tiers[0]?.minVisits !== 0) {
      ctx.addIssue({ code: 'custom', path: ['tiers', 0, 'minVisits'], message: 'Birinci status 0 ziyarətdən başlamalıdır.' })
    }
    tiers.forEach((tier, i) => {
      if (i > 0 && tier.minVisits <= tiers[i - 1].minVisits) {
        ctx.addIssue({ code: 'custom', path: ['tiers', i, 'minVisits'], message: 'Hər status əvvəlkindən çox ziyarət tələb etməlidir.' })
      }
      for (const field of ['hallPercent', 'roomPercent']) {
        if (tier[field] > club.maxPercent) {
          ctx.addIssue({ code: 'custom', path: ['tiers', i, field], message: `Maksimum endirim ${club.maxPercent}%-dir.` })
        }
      }
    })
    const keys = new Set(tiers.map((t) => t.key))
    if (keys.size !== tiers.length) ctx.addIssue({ code: 'custom', path: ['tiers'], message: 'Statusların açarları təkrarlanmamalıdır.' })
  })

// Ayarları oxuyur. Hələ saxlanmayıbsa — standart ayarlar və bu gün (Club işə düşən gün) yadda saxlanır:
// ziyarətlər həmin gündən sayılır.
export async function getClub(db = prisma) {
  const row = await db.appSetting.findUnique({ where: { key: SETTING_KEY } })
  if (row) {
    try {
      const parsed = clubSchema.safeParse(JSON.parse(row.value))
      if (parsed.success) return parsed.data
    } catch {}
  }
  const club = { ...DEFAULT_CLUB, startDay: bakuDay() }
  if (!row) {
    await db.appSetting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value: JSON.stringify(club) }, update: {} })
    const saved = await db.appSetting.findUnique({ where: { key: SETTING_KEY } })
    return clubSchema.parse(JSON.parse(saved.value))
  }
  return club
}

export async function saveClub(input) {
  const club = clubSchema.parse(input)
  const value = JSON.stringify(club)
  await prisma.appSetting.upsert({ where: { key: SETTING_KEY }, create: { key: SETTING_KEY, value }, update: { value } })
  return club
}

// Hesablama pəncərəsinin ilk günü: son `months` ay, amma Club işə düşməzdən əvvəl yox
export function windowStartDay(club, now = new Date()) {
  const from = new Date(now)
  from.setUTCMonth(from.getUTCMonth() - club.months)
  const day = bakuDay(from)
  return day > club.startDay ? day : club.startDay
}

// İstifadəçilərin sayılan ziyarət günləri: Map<userId, string[] (artan sıra ilə)>
async function countedDays(userIds, club) {
  const result = new Map(userIds.map((id) => [id, []]))
  if (userIds.length === 0) return result
  const visits = await prisma.visit.findMany({
    where: { userId: { in: userIds }, endedAt: { not: null }, amount: { gt: 0 }, day: { gte: windowStartDay(club) } },
    select: { userId: true, day: true },
    orderBy: { day: 'asc' },
  })
  for (const v of visits) {
    const days = result.get(v.userId)
    if (days.at(-1) !== v.day) days.push(v.day)
  }
  return result
}

export const tierFor = (club, visits) => {
  let index = 0
  club.tiers.forEach((tier, i) => {
    if (visits >= tier.minVisits) index = i
  })
  return index
}

// Günə ay əlavə et: "2026-11-12" + 6 → "2027-05-12"
const addMonths = (day, months) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

// Admin status verəndə yazılan bonus: hələ qüvvədədirsə (clubBonusUntil gəlməyib) — { bonus, until, tierKey, setAt }
const activeBonus = (user, today = bakuDay()) =>
  user?.clubBonus != null && user.clubBonusUntil && today < user.clubBonusUntil
    ? { bonus: user.clubBonus, until: user.clubBonusUntil, tierKey: user.clubTier, setAt: user.clubTierSetAt }
    : null

// Bir müştərinin statusu: hazırkı və növbəti status, ziyarət sayı, statusun qorunması üçün tarix.
// Admin status veribsə, bonus ziyarətlər həqiqi ziyarətlərin üstünə gəlir (mənfi də ola bilər) — status adi qayda ilə artıb-azalır.
function statusFrom(club, days, user = null) {
  const realVisits = days.length
  const bonus = activeBonus(user)
  const visits = Math.max(0, realVisits + (bonus?.bonus ?? 0))
  const index = tierFor(club, visits)
  const tier = club.tiers[index]
  const next = club.tiers[index + 1] ?? null
  // Ən köhnə sayılan ziyarət (və ya bonus) bu gün hesabdan çıxır — gəlməsə, ziyarət sayı azalır
  const leaving = [days.length ? addMonths(days[0], club.months) : null, bonus?.bonus > 0 ? bonus.until : null].filter(Boolean).sort()
  const given = bonus ? club.tiers.find((t) => t.key === bonus.tierKey) : null
  return {
    visits,
    realVisits,
    // Admin verdiyi status (bonus hələ sayılırsa)
    given: bonus ? { key: bonus.tierKey, name: given?.name ?? null, bonus: bonus.bonus, until: bonus.until, setAt: bonus.setAt } : null,
    tier: { key: tier.key, index, name: tier.name, icon: tier.icon, color: tier.color, hallPercent: tier.hallPercent, roomPercent: tier.roomPercent },
    next: next ? { key: next.key, name: next.name, icon: next.icon, minVisits: next.minVisits, needed: next.minVisits - visits } : null,
    // Hazırkı statusda qalmaq üçün lazım olan ziyarət sayı (birinci statusda — 0)
    keepVisits: tier.minVisits,
    leavesOn: leaving[0] ?? null,
  }
}

// Bir neçə istifadəçinin statusu birdən (admin siyahıları üçün): Map<userId, status>
export async function clubStatuses(userIds, club) {
  const [days, users] = await Promise.all([
    countedDays(userIds, club),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, clubTier: true, clubBonus: true, clubBonusUntil: true, clubTierSetAt: true },
    }),
  ])
  const byId = new Map(users.map((u) => [u.id, u]))
  return new Map([...days.entries()].map(([id, list]) => [id, statusFrom(club, list, byId.get(id))]))
}

// Admin müştəriyə status verir: həmin statusa çatmaq üçün lazım olan fərq bonus kimi yazılır,
// bonus `months` ay sayılır (adi ziyarətlər kimi). Sonra status adi qayda ilə artıb-azalır.
export async function giveTier(userId, tierKey, adminId, club) {
  const tier = club.tiers.find((t) => t.key === tierKey)
  const real = (await countedDays([userId], club)).get(userId).length
  await prisma.user.update({
    where: { id: userId },
    data: {
      clubTier: tier.key,
      clubBonus: tier.minVisits - real,
      clubBonusUntil: addMonths(bakuDay(), club.months),
      clubTierSetAt: new Date(),
      clubTierSetById: adminId,
    },
  })
}

export const clearTier = (userId) =>
  prisma.user.update({
    where: { id: userId },
    data: { clubTier: null, clubBonus: null, clubBonusUntil: null, clubTierSetAt: null, clubTierSetById: null },
  })

export async function clubStatus(userId, club) {
  return (await clubStatuses([userId], club)).get(userId)
}

// Seans başlayanda müştərinin statusu seansa yazılır (endirim qaydaları sonra dəyişsə də seansınkı qalır)
export async function clubSnapshot(userId) {
  const club = await getClub()
  if (!club.enabled || !userId) return null
  const status = await clubStatus(userId, club)
  const { tier } = status
  if (!tier.hallPercent && !tier.roomPercent) return null
  return {
    tier: tier.key,
    name: tier.name.az,
    hallPercent: tier.hallPercent,
    roomPercent: tier.roomPercent,
    stack: club.combine === 'stack',
    group: club.group,
  }
}

// Saytda göstərilən ayarlar (kabinet, qaydalar)
export const publicClub = (club) => ({
  enabled: club.enabled,
  months: club.months,
  maxPercent: club.maxPercent,
  combine: club.combine,
  group: club.group,
  startDay: club.startDay,
  tiers: club.tiers,
})

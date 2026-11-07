import { useEffect, useState } from 'react'

// Günün hesabatı — seansın qiyməti. Qayda server/src/visits.js ilə eynidir (birini dəyişəndə o birini də dəyiş).
// pricing — qiymət cədvəli ({ hall, room }), kind — 'hall' (ümumi zal) və ya 'room' (kino otağı).
// Vaxt (hər ikisində eyni):
// - ilk saat həmişə tam ödənilir (30 dəqiqə qalsa da);
// - sonra vaxt yarım saatlıq addımla sayılır, hər yarım saatı hall.graceMinutes dəqiqə keçmək pulsuzdur:
//   1s10d → 1 saat, 1s15d → 1.5 saat, 1s40d → 1.5 saat, 1s45d → 2 saat.
// Zal: nəfər başına, stop çek hər nəfərə; qrupda məbləğ = nəfər başına × nəfər sayı.
// Kino otağı: bütün otaq üçün (saytdakı kalkulyatorla eyni) — kiçik qrup ilk saat + sonrakı saatlar,
// böyük qrup saatlıq qiymət + daxil olandan artıq hər nəfərə saatlıq əlavə. Stop çek yoxdur.
// Tələbə endirimi (yalnız zalda): students nəfər tələbədirsə və hesablanan vaxt studentDiscount.minHours-dan az deyilsə,
// onların payından studentDiscount.percent faiz çıxılır.
// Promokod (zal və kino otağı): bütün məbləğdən promoPercent faiz. Endirimlər cəmlənmir — hansı çoxdursa, o
// (saytdakı kalkulyatorla eyni). discountSource: 'student' | 'promo' | null.
// Üçüncü parametr seansın özü ola bilər: visitPrice(pricing, minutes, visit).
export function visitPrice(pricing, minutes, { people = 1, kind = 'hall', students = 0, promoPercent = 0 } = {}) {
  const { hall, room, studentDiscount } = pricing
  const grace = hall.graceMinutes ?? 10
  const halfHours = Math.max(0, Math.ceil((minutes - 60 - grace) / 30))
  const hours = 1 + halfHours / 2
  const round2 = (n) => Math.round(n * 100) / 100

  if (kind === 'room') {
    const { smallGroup, group } = room
    const raw =
      people <= smallGroup.maxPeople
        ? smallGroup.firstHour + (hours - 1) * smallGroup.nextHour
        : group.perHour * hours + Math.max(0, people - group.includedPeople) * group.extraPerPerson * hours
    const discount = round2((raw * (promoPercent ?? 0)) / 100)
    return {
      billedHours: hours,
      perPerson: null,
      discount,
      discountSource: discount > 0 ? 'promo' : null,
      studentEligible: false,
      amount: round2(raw - discount),
      capped: false,
    }
  }

  const raw = hall.firstHour + (halfHours * hall.nextHour) / 2
  const perPerson = round2(Math.min(raw, hall.cap))
  const studentCount = Math.min(students, people)
  const studentEligible = studentCount > 0 && studentDiscount?.percent > 0 && hours >= studentDiscount.minHours
  const subtotal = perPerson * people
  const studentOff = studentEligible ? round2((perPerson * studentCount * studentDiscount.percent) / 100) : 0
  const promoOff = round2((subtotal * (promoPercent ?? 0)) / 100)
  const discount = Math.max(studentOff, promoOff)
  return {
    billedHours: hours,
    perPerson,
    discount,
    discountSource: discount === 0 ? null : promoOff > studentOff ? 'promo' : 'student',
    studentEligible,
    amount: round2(subtotal - discount),
    capped: raw > hall.cap,
  }
}

// Keçən tam dəqiqələr
export const visitMinutes = (startedAt, endedAt) =>
  Math.max(0, Math.floor(((endedAt ? new Date(endedAt) : new Date()).getTime() - new Date(startedAt).getTime()) / 60000))

// Davam edən seansın müddəti saniyəsi ilə: "1:05:09"
export function elapsedClock(startedAt, now = Date.now()) {
  const total = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  const pad = (n) => String(n).padStart(2, '0')
  return `${Math.floor(total / 3600)}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}

// Müddət: 75 → "1 s 15 dəq" (vahidlər çağırana görə)
export function durationText(minutes, { h = 's', m = 'dəq' } = {}) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} ${m}`
  return rest ? `${hours} ${h} ${rest} ${m}` : `${hours} ${h}`
}

// Hər "ms"-də yenilənən indiki vaxt — canlı saat və məbləğ üçün. enabled=false olanda dayanır.
export function useNow(ms = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms, enabled])
  return now
}

// Bakı vaxtı (UTC+4) ilə: tarix "2026-11-07" və saat "14:05"
const BAKU_OFFSET_MS = 4 * 60 * 60 * 1000
export const bakuDay = (date = new Date()) => new Date(new Date(date).getTime() + BAKU_OFFSET_MS).toISOString().slice(0, 10)
export const bakuTime = (date) => new Date(new Date(date).getTime() + BAKU_OFFSET_MS).toISOString().slice(11, 16)

// "2026-11-07" → bir gün əvvəl/sonra
export function shiftDay(day, delta) {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

// <input type="datetime-local"> ↔ ISO, Bakı vaxtı ilə (adminin kompüterinin saat qurşağından asılı olmasın)
export const toBakuInput = (iso) => new Date(new Date(iso).getTime() + BAKU_OFFSET_MS).toISOString().slice(0, 16)
export const fromBakuInput = (value) => new Date(Date.parse(`${value}:00Z`) - BAKU_OFFSET_MS).toISOString()

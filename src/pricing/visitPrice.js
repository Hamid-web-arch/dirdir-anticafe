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
// Tələbə endirimi (yalnız zalda): students nəfər tələbədirsə, onların payından qalma müddətinə görə faiz çıxılır —
// studentDiscount.long.minHours saat və çox qalanda long.percent, short.minHours saat qalanda short.percent.
// Promokod (zal və kino otağı): bütün məbləğdən promoPercent faiz.
// Xüsusi endirim (admin verir, zal və kino otağı): bütün məbləğdən discountValue faiz (discountType 'percent')
// və ya discountValue manat ('amount', məbləğdən çox ola bilməz).
// DırDır Club status endirimi (club — seans başlayanda yazılan status; seans club.minHours saatdan qısadırsa — yoxdur):
// kino otağında bütün qiymətə, zalda müştərinin
// öz payına (club.group — bütün qrupa). Endirimlər cəmlənmir — hansı çoxdursa, o; club.stack olanda status endirimi
// digərinin üstünə gəlir. discountSource: 'student' | 'promo' | 'custom' | 'club' | null; clubDiscount — status payı.
// Üçüncü parametr seansın özü ola bilər: visitPrice(pricing, minutes, visit).
export function visitPrice(
  pricing,
  minutes,
  {
    people = 1,
    kind = 'hall',
    students = 0,
    promoPercent = 0,
    discountType = null,
    discountValue = null,
    club = null,
    persons = null,
  } = {},
) {
  const { hall, room, studentDiscount } = pricing
  const grace = hall.graceMinutes ?? 10
  const halfHours = Math.max(0, Math.ceil((minutes - 60 - grace) / 30))
  const hours = 1 + halfHours / 2
  const round2 = (n) => Math.round(n * 100) / 100
  const custom = Number(discountValue ?? 0)
  const customOff = (base) =>
    custom > 0 ? round2(discountType === 'amount' ? Math.min(custom, base) : (base * Math.min(custom, 100)) / 100) : 0
  // Ən böyük endirim; bərabər olanda sıra: tələbə, promokod, xüsusi, club
  const best = (options) => {
    const [source, discount] = options.reduce((a, b) => (b[1] > a[1] ? b : a), [null, 0])
    return { discount, discountSource: discount > 0 ? source : null }
  }
  // DırDır Club status endirimi (seansın club məlumatından). club.stack — digər endirimin üstünə gəlir,
  // yoxsa digərləri ilə yarışır (ən böyüyü). Cəmi heç vaxt məbləğdən çox olmur.
  const withClub = (options, clubOff, total, clubInfo = club) => {
    if (!(clubOff > 0)) return { ...best(options), clubDiscount: 0 }
    if (!clubInfo.stack) {
      const result = best([...options, ['club', clubOff]])
      return { ...result, clubDiscount: result.discountSource === 'club' ? result.discount : 0 }
    }
    const other = best(options)
    const discount = round2(Math.min(total, other.discount + clubOff))
    return { discount, discountSource: other.discountSource ?? 'club', clubDiscount: round2(discount - other.discount) }
  }
  // Status endirimi yalnız seans club.minHours saat (hesablanan vaxt) və çox olanda
  const clubPercent = club && hours >= (club.minHours ?? 0) ? ((kind === 'room' ? club.roomPercent : club.hallPercent) ?? 0) : 0

  // Yeni seanslar: sifarişdə nəfərlər (üzvlər və qonaqlar) — hər nəfərin payı ayrıca hesablanır
  if (persons?.length) return personsPrice()

  if (kind === 'room') {
    const { smallGroup, group } = room
    const raw =
      people <= smallGroup.maxPeople
        ? smallGroup.firstHour + (hours - 1) * smallGroup.nextHour
        : group.perHour * hours + Math.max(0, people - group.includedPeople) * group.extraPerPerson * hours
    // Kino otağında status endirimi bütün otağın qiymətinə
    const { discount, discountSource, clubDiscount } = withClub(
      [
        ['promo', round2((raw * (promoPercent ?? 0)) / 100)],
        ['custom', customOff(raw)],
      ],
      round2((raw * clubPercent) / 100),
      raw,
    )
    return {
      billedHours: hours,
      perPerson: null,
      discount,
      discountSource,
      clubDiscount,
      studentEligible: false,
      studentPercent: 0,
      amount: round2(raw - discount),
      capped: false,
    }
  }

  const raw = hall.firstHour + (halfHours * hall.nextHour) / 2
  const perPerson = round2(Math.min(raw, hall.cap))
  const studentCount = Math.min(students, people)
  const percent = studentCount > 0 ? studentPercent(studentDiscount, hours) : 0
  const subtotal = perPerson * people
  // Zalda status endirimi müştərinin öz payına (club.group — bütün qrupa)
  const { discount, discountSource, clubDiscount } = withClub(
    [
      ['student', round2((perPerson * studentCount * percent) / 100)],
      ['promo', round2((subtotal * (promoPercent ?? 0)) / 100)],
      ['custom', customOff(subtotal)],
    ],
    round2(((club?.group ? subtotal : perPerson) * clubPercent) / 100),
    subtotal,
  )
  return {
    billedHours: hours,
    perPerson,
    discount,
    discountSource,
    clubDiscount,
    studentEligible: percent > 0,
    studentPercent: percent,
    amount: round2(subtotal - discount),
    capped: raw > hall.cap,
  }

  // Hər nəfər öz payını ödəyir:
  // - zal: payı nəfər başı qiymətdir; ondan nəfərin ən böyük endirimi çıxılır — öz statusu (2 saat şərti ilə),
  //   tələbədirsə tələbə endirimi, promokod, xüsusi endirim (manatla olanda sifarişin endirimi nəfərlərə bərabər bölünür);
  // - kino otağı: qrupdakı ən yüksək statusun endirimi bütün otağa, yekun məbləğ nəfərlərə bərabər bölünür.
  function personsPrice() {
    const n = persons.length
    const promoPct = promoPercent ?? 0
    const clubPct = (c, field) => (c && hours >= (c.minHours ?? 0) ? (c[field] ?? 0) : 0)
    const sum = (list, key) => round2(list.reduce((s, x) => s + x[key], 0))
    let shares
    let perPerson = null
    let capped = false
    let percent = 0

    if (kind === 'room') {
      const { smallGroup, group } = room
      const raw =
        n <= smallGroup.maxPeople
          ? smallGroup.firstHour + (hours - 1) * smallGroup.nextHour
          : group.perHour * hours + Math.max(0, n - group.includedPeople) * group.extraPerPerson * hours
      const top = persons
        .map((p) => p.club)
        .filter(Boolean)
        .reduce((a, c) => (clubPct(c, 'roomPercent') > clubPct(a, 'roomPercent') ? c : a), null)
      const result = withClub(
        [
          ['promo', round2((raw * promoPct) / 100)],
          ['custom', customOff(raw)],
        ],
        round2((raw * clubPct(top, 'roomPercent')) / 100),
        raw,
        top,
      )
      // Bərabər bölgü; qəpik qalığı sonuncu nəfərdə
      const total = round2(raw - result.discount)
      const base = Math.floor((total / n) * 100) / 100
      const off = Math.floor((result.discount / n) * 100) / 100
      const clubOff = Math.floor((result.clubDiscount / n) * 100) / 100
      shares = persons.map((p, i) => {
        const last = i === n - 1
        return {
          share: last ? round2(total - base * (n - 1)) : base,
          discount: last ? round2(result.discount - off * (n - 1)) : off,
          discountSource: result.discountSource,
          clubDiscount: last ? round2(result.clubDiscount - clubOff * (n - 1)) : clubOff,
        }
      })
    } else {
      const raw = hall.firstHour + (halfHours * hall.nextHour) / 2
      perPerson = round2(Math.min(raw, hall.cap))
      capped = raw > hall.cap
      percent = studentPercent(studentDiscount, hours)
      const customEach =
        custom > 0 ? round2(discountType === 'amount' ? Math.min(custom / n, perPerson) : (perPerson * Math.min(custom, 100)) / 100) : 0
      // Club ayarı "bütün qrupa": qonaqlar (statussuz nəfərlər) qrupdakı ən yüksək statuslu üzvün endirimini alır
      const groupClub = persons
        .map((p) => p.club)
        .filter((c) => c?.group)
        .reduce((a, c) => (clubPct(c, 'hallPercent') > clubPct(a, 'hallPercent') ? c : a), null)
      shares = persons.map((p) => {
        const personClub = p.club ?? groupClub
        const result = withClub(
          [
            ['student', p.student ? round2((perPerson * percent) / 100) : 0],
            ['promo', round2((perPerson * promoPct) / 100)],
            ['custom', customEach],
          ],
          round2((perPerson * clubPct(personClub, 'hallPercent')) / 100),
          perPerson,
          personClub,
        )
        return { share: round2(perPerson - result.discount), ...result }
      })
    }

    const sources = [...new Set(shares.map((s) => s.discountSource).filter(Boolean))]
    return {
      billedHours: hours,
      perPerson,
      discount: sum(shares, 'discount'),
      discountSource: sources.length > 1 ? 'mixed' : (sources[0] ?? null),
      clubDiscount: sum(shares, 'clubDiscount'),
      studentEligible: kind !== 'room' && percent > 0 && persons.some((p) => p.student),
      studentPercent: kind === 'room' ? 0 : percent,
      amount: sum(shares, 'share'),
      capped,
      persons: shares,
    }
  }
}

// Tələbə endiriminin faizi qalma müddətinə görə: əvvəl uzun pillə, sonra qısa; heç birinə çatmırsa — 0
export function studentPercent(studentDiscount, hours) {
  for (const tier of [studentDiscount?.long, studentDiscount?.short]) {
    if (tier?.percent > 0 && hours >= tier.minHours) return tier.percent
  }
  return 0
}

// Bitmiş seansın pulu ödəniş üsullarına görə: beh öz üsuluna, qalıq (məbləğ − beh) bitəndə seçilən üsula.
// Qalıq mənfi ola bilər (beh çox alınıb — fərq qaytarılır). Üsulu bilinməyən — "other".
// server/src/visits.js → paymentSplit ilə eynidir.
export function paymentSplit(v) {
  const split = { cash: 0, card: 0, other: 0 }
  if (!v.endedAt || v.amount == null) return split
  const deposit = Number(v.deposit ?? 0)
  const add = (method, value) => {
    split[method === 'cash' || method === 'card' ? method : 'other'] += value
  }
  if (deposit > 0) add(v.depositMethod, deposit)
  // Sifarişdə nəfərlər varsa — hər nəfərin payı öz üsulunda; beh birinci nəfərin ödəməsindən çıxılır
  if (v.persons?.some((p) => p.amount != null)) {
    for (const p of v.persons) add(p.paymentMethod, Number(p.amount ?? 0))
    if (deposit > 0) add(v.persons[0].paymentMethod, -deposit)
  } else {
    add(v.paymentMethod, Number(v.amount) - deposit)
  }
  for (const key of Object.keys(split)) split[key] = Math.round(split[key] * 100) / 100
  return split
}

// Faizi 0 olmayan tələbə endirimi pillələri, qısadan uzuna: [{ minHours, percent }]
export const studentTiers = (studentDiscount) => [studentDiscount?.short, studentDiscount?.long].filter((tier) => tier?.percent > 0)

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

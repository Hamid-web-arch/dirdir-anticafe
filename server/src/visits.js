// Günün hesabatı: müştəri seanslarının qiyməti və günlərə bölünməsi.
// Qiymət qaydası saytdakı src/pricing/visitPrice.js ilə eynidir — birini dəyişəndə o birini də dəyiş.

// Bakı vaxtı UTC+4-dür (yay saatı yoxdur).
const BAKU_OFFSET_MS = 4 * 60 * 60 * 1000

// Anın Bakı tarixi: "2026-11-07"
export const bakuDay = (date = new Date()) => new Date(date.getTime() + BAKU_OFFSET_MS).toISOString().slice(0, 10)

// Seansın müddəti tam dəqiqə ilə (yarımçıq dəqiqə sayılmır)
export const visitMinutes = (startedAt, endedAt = new Date()) =>
  Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000))

// Seansın qiyməti. pricing — qiymət cədvəli ({ hall, room }), kind — 'hall' (ümumi zal) və ya 'room' (kino otağı).
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
// Endirimlər cəmlənmir — hansı çoxdursa, o (saytdakı kalkulyatorla eyni). discountSource: 'student' | 'promo' | 'custom' | null.
// Üçüncü parametr seansın özü ola bilər: visitPrice(pricing, minutes, visit).
export function visitPrice(
  pricing,
  minutes,
  { people = 1, kind = 'hall', students = 0, promoPercent = 0, discountType = null, discountValue = null } = {},
) {
  const { hall, room, studentDiscount } = pricing
  const grace = hall.graceMinutes ?? 10
  const halfHours = Math.max(0, Math.ceil((minutes - 60 - grace) / 30))
  const hours = 1 + halfHours / 2
  const round2 = (n) => Math.round(n * 100) / 100
  const custom = Number(discountValue ?? 0)
  const customOff = (base) =>
    custom > 0 ? round2(discountType === 'amount' ? Math.min(custom, base) : (base * Math.min(custom, 100)) / 100) : 0
  // Ən böyük endirim; bərabər olanda sıra: tələbə, promokod, xüsusi
  const best = (options) => {
    const [source, discount] = options.reduce((a, b) => (b[1] > a[1] ? b : a), [null, 0])
    return { discount, discountSource: discount > 0 ? source : null }
  }

  if (kind === 'room') {
    const { smallGroup, group } = room
    const raw =
      people <= smallGroup.maxPeople
        ? smallGroup.firstHour + (hours - 1) * smallGroup.nextHour
        : group.perHour * hours + Math.max(0, people - group.includedPeople) * group.extraPerPerson * hours
    const { discount, discountSource } = best([
      ['promo', round2((raw * (promoPercent ?? 0)) / 100)],
      ['custom', customOff(raw)],
    ])
    return {
      billedHours: hours,
      perPerson: null,
      discount,
      discountSource,
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
  const { discount, discountSource } = best([
    ['student', round2((perPerson * studentCount * percent) / 100)],
    ['promo', round2((subtotal * (promoPercent ?? 0)) / 100)],
    ['custom', customOff(subtotal)],
  ])
  return {
    billedHours: hours,
    perPerson,
    discount,
    discountSource,
    studentEligible: percent > 0,
    studentPercent: percent,
    amount: round2(subtotal - discount),
    capped: raw > hall.cap,
  }
}

// Tələbə endiriminin faizi qalma müddətinə görə: əvvəl uzun pillə, sonra qısa; heç birinə çatmırsa — 0
export function studentPercent(studentDiscount, hours) {
  for (const tier of [studentDiscount?.long, studentDiscount?.short]) {
    if (tier?.percent > 0 && hours >= tier.minHours) return tier.percent
  }
  return 0
}

// Klientə qaytarılan seans
export const publicVisit = (v) => ({
  id: v.id,
  day: v.day,
  name: v.name,
  kind: v.kind,
  people: v.people,
  students: v.students,
  promoCode: v.promoCode,
  promoPercent: v.promoPercent,
  discountType: v.discountType,
  discountValue: v.discountValue == null ? null : Number(v.discountValue),
  user: v.user ? { id: v.user.id, firstName: v.user.firstName, lastName: v.user.lastName, phone: v.user.phone } : null,
  startedAt: v.startedAt,
  endedAt: v.endedAt,
  minutes: v.minutes,
  amount: v.amount == null ? null : Number(v.amount),
  paymentMethod: v.paymentMethod,
  note: v.note,
})

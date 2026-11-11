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
// DırDır Club status endirimi (club — seans başlayanda yazılan status; seans club.minHours saatdan qısadırsa — yoxdur):
// kino otağında bütün qiymətə, zalda müştərinin
// öz payına (club.group — bütün qrupa). Endirimlər cəmlənmir — hansı çoxdursa, o; club.stack olanda status endirimi
// digərinin üstünə gəlir. discountSource: 'student' | 'promo' | 'custom' | 'club' | null; clubDiscount — status payı.
// Üçüncü parametr seansın özü ola bilər: visitPrice(pricing, minutes, visit).
export function visitPrice(
  pricing,
  minutes,
  { people = 1, kind = 'hall', students = 0, promoPercent = 0, discountType = null, discountValue = null, club = null } = {},
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
  const withClub = (options, clubOff, total) => {
    if (!(clubOff > 0)) return { ...best(options), clubDiscount: 0 }
    if (!club.stack) {
      const result = best([...options, ['club', clubOff]])
      return { ...result, clubDiscount: result.discountSource === 'club' ? result.discount : 0 }
    }
    const other = best(options)
    const discount = round2(Math.min(total, other.discount + clubOff))
    return { discount, discountSource: other.discountSource ?? 'club', clubDiscount: round2(discount - other.discount) }
  }
  // Status endirimi yalnız seans club.minHours saat (hesablanan vaxt) və çox olanda
  const clubPercent = club && hours >= (club.minHours ?? 0) ? ((kind === 'room' ? club.roomPercent : club.hallPercent) ?? 0) : 0

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
}

// Tələbə endiriminin faizi qalma müddətinə görə: əvvəl uzun pillə, sonra qısa; heç birinə çatmırsa — 0
export function studentPercent(studentDiscount, hours) {
  for (const tier of [studentDiscount?.long, studentDiscount?.short]) {
    if (tier?.percent > 0 && hours >= tier.minHours) return tier.percent
  }
  return 0
}

// Bitmiş seansın pulu ödəniş üsullarına görə: beh öz üsuluna, qalıq (məbləğ − beh) bitəndə seçilən üsula.
// Qalıq mənfi ola bilər (beh məbləğdən çox — fərq müştəriyə qaytarılır). Üsulu bilinməyən — "other".
// Saytdakı src/pricing/visitPrice.js → paymentSplit ilə eynidir.
export function paymentSplit(v) {
  const split = { cash: 0, card: 0, other: 0 }
  if (!v.endedAt || v.amount == null) return split
  const amount = Number(v.amount)
  const deposit = Number(v.deposit ?? 0)
  const add = (method, value) => {
    split[method === 'cash' || method === 'card' ? method : 'other'] += value
  }
  if (deposit > 0) add(v.depositMethod, deposit)
  add(v.paymentMethod, amount - deposit)
  for (const key of Object.keys(split)) split[key] = Math.round(split[key] * 100) / 100
  return split
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
  deposit: v.deposit == null ? null : Number(v.deposit),
  depositMethod: v.depositMethod,
  club: v.club ?? null,
  user: v.user ? { id: v.user.id, firstName: v.user.firstName, lastName: v.user.lastName, phone: v.user.phone } : null,
  startedAt: v.startedAt,
  endedAt: v.endedAt,
  minutes: v.minutes,
  amount: v.amount == null ? null : Number(v.amount),
  paymentMethod: v.paymentMethod,
  note: v.note,
})

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
// digərinin üstünə gəlir. discountSource: 'student' | 'promo' | 'custom' | 'club' | 'gift' | null; clubDiscount — status payı.
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
  // Hədiyyə çarxının hədiyyəsi zalda: faiz — payın faizi, pulsuz dəqiqələr — ilk saatın qiyməti ilə (paydan çox olmur)
  const giftOff = (gift, base) => {
    if (!gift || gift.only === 'room') return 0
    if (gift.kind === 'percent') return round2((base * Math.min(Number(gift.value) || 0, 100)) / 100)
    if (gift.kind === 'minutes') return round2(Math.min(base, (hall.firstHour * (Number(gift.value) || 0)) / 60))
    return 0
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
  // Hədiyyə çarxının hədiyyəsi (p.gift) də endirimlərdən biridir ('gift'), digərləri ilə yarışır (ən böyüyü):
  // zalda — nəfərin öz payına (faiz və ya pulsuz dəqiqələr ilk saatın qiyməti ilə); kino otağında — faiz bütün otağa.
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
      const giftPct = persons.reduce(
        (a, p) => (p.gift?.kind === 'percent' && p.gift.only !== 'hall' ? Math.max(a, Number(p.gift.value) || 0) : a),
        0,
      )
      const result = withClub(
        [
          ['promo', round2((raw * promoPct) / 100)],
          ['custom', customOff(raw)],
          ['gift', round2((raw * Math.min(giftPct, 100)) / 100)],
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
            ['gift', giftOff(p.gift, perPerson)],
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
  // Sifarişdə nəfərlər varsa — hər nəfərin payı öz üsulunda; beh birinci nəfərin ödəməsindən çıxılır
  if (v.persons?.some((p) => p.amount != null)) {
    for (const p of v.persons) add(p.paymentMethod, Number(p.amount ?? 0))
    if (deposit > 0) add(v.persons[0].paymentMethod, -deposit)
  } else {
    add(v.paymentMethod, amount - deposit)
  }
  for (const key of Object.keys(split)) split[key] = Math.round(split[key] * 100) / 100
  return split
}

// Müştəri kodu: 1001 → "DD1001" (auth.js-dəki ilə eyni; dövri importdan qaçmaq üçün burada da)
const codeOf = (no) => (no == null ? null : `DD${String(no).padStart(4, '0')}`)

// Sifarişdəki bir nəfər: üzvdürsə adı və kodu ilə
export const publicPerson = (p) => ({
  id: p.id,
  userId: p.userId ?? null,
  user: p.user ? { id: p.user.id, firstName: p.user.firstName, lastName: p.user.lastName, phone: p.user.phone, customerCode: codeOf(p.user.customerNo) } : null,
  student: p.student,
  club: p.club ?? null,
  amount: p.amount == null ? null : Number(p.amount),
  discount: p.discount == null ? null : Number(p.discount),
  paymentMethod: p.paymentMethod ?? null,
  // Hədiyyə çarxının hədiyyəsi (endirim kimi)
  spinId: p.spinId ?? null,
  gift: p.gift ?? null,
})

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
  // Sifarişdəki nəfərlər (köhnə seanslarda boş siyahı)
  persons: (v.persons ?? []).map(publicPerson),
  startedAt: v.startedAt,
  endedAt: v.endedAt,
  minutes: v.minutes,
  amount: v.amount == null ? null : Number(v.amount),
  paymentMethod: v.paymentMethod,
  note: v.note,
})

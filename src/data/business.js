// Biznes məlumatları: qiymətlər, əlaqə, ikonlar. Saytdakı mətnlər (3 dildə) src/i18n/*.js-dədir.

import { PiDiceFive, PiFilmSlate, PiCookie, PiCalendarBlank, PiTeaBag, PiCoffee, PiPintGlass } from 'react-icons/pi'

export const business = {
  name: 'DırDır Anticafe',
  instagramHandle: '@dirdiranticafe',
  instagramUrl: 'https://www.instagram.com/dirdiranticafe/',
  // WhatsApp nömrəsi: yalnız rəqəmlər, ölkə kodu ilə, + olmadan (məs. '994501234567').
  // Boş qalsa, "Rezerv et" düymələri Instagram-a yönləndirir.
  whatsappNumber: '994775530305',
  whatsappMessage: 'Salam! DırDır Anticafe-də kino otağını rezerv etmək istəyirəm. _Vaxt aralığı_ üçün otaq boşdurmu?',
  currency: '₼',
  // Standart qiymət cədvəli. Əsl qiymətlər admin paneldən dəyişir və serverdən gəlir (src/pricing/PricingContext.jsx);
  // bu cədvəl yalnız server cavab verənə qədər və ya backend qoşulmayanda işləyir. server/src/pricing.js ilə eyni olmalıdır.
  pricing: {
    // Ümumi zal: ilk saat + sonrakı hər saat; bir nəfər stop çekdən artıq ödəmir.
    hall: { firstHour: 4, nextHour: 3, cap: 13 },
    // Kino otağı (maksimum maxPeople nəfər):
    // - smallGroup.maxPeople nəfərə qədər: ilk saat firstHour, sonrakı hər saat nextHour
    // - daha çox: saatı perHour; includedPeople nəfərdən sonra hər əlavə nəfər saatda +extraPerPerson
    room: {
      maxPeople: 8,
      smallGroup: { maxPeople: 2, firstHour: 15, nextHour: 10 },
      group: { perHour: 20, includedPeople: 5, extraPerPerson: 2 },
    },
    // Tələbə endirimi (yalnız zalda): minHours saat və daha çox qalanda percent faiz.
    studentDiscount: { percent: 20, minHours: 3 },
  },
  // Promokodlar: KOD: endirim faizi, məs. { YAY2026: 15 }. Böyük/kiçik hərf fərq etmir.
  // Endirimlər toplanmır — tələbə endirimi ilə promokoddan hansı böyükdürsə, o tətbiq olunur.
  // Siyahı boş olanda hesablayıcıda promokod sahəsi görünmür.
  promoCodes: {},
  // Hesablayıcıdakı slayderlərin hədləri (kino otağında nəfər həddi qiymətlərdəki otaq tutumundan gəlir)
  calculator: {
    hall: { people: { min: 1, max: 20 }, hours: { min: 1, max: 12, step: 0.5 } },
    room: { people: { min: 1 }, hours: { min: 1, max: 12, step: 1 } },
  },
  hours: '11:00 – 23:00',
  mapEmbedUrl:
    // Yalnız koordinat verəndə Google dəqiq yerə qırmızı nişan qoyur
    'https://maps.google.com/maps?q=40.3705961,49.8420727&z=17&output=embed',
  mapUrl: 'https://maps.app.goo.gl/ELRPJtAMzjBzA2yH9',
  // Mətnlər: src/i18n/*.js → events.items (eyni sıra ilə)
  amenityIcons: [PiDiceFive, PiFilmSlate, PiCookie, PiCalendarBlank],
  // Mətnlər: src/i18n/*.js → menu.items (eyni sıra ilə)
  menuIcons: [PiTeaBag, PiCoffee, PiCookie, PiPintGlass],
  // "Nələr var?" slayderi artıq bazadadır — admin paneldən idarə olunur.
}

// WhatsApp linki hazır mesajla; nömrə boşdursa Instagram-a yönləndirir.
export const whatsappUrl = (message) =>
  business.whatsappNumber
    ? `https://wa.me/${business.whatsappNumber}${message ? `?text=${encodeURIComponent(message)}` : ''}`
    : business.instagramUrl

// Ekranda göstərmək üçün: "994775530305" → "+994 77 553 03 05"
export const whatsappDisplay = business.whatsappNumber.replace(/^(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})$/, '+$1 $2 $3 $4 $5')

// "Rezerv et" linki (kino otağı mesajı ilə)
export const reserveUrl = whatsappUrl(business.whatsappMessage)

// Sponsorluq müraciəti üçün hazır mesaj
export const sponsorUrl = whatsappUrl('Salam! DırDır Anticafe-yə sponsor olmaq istəyirəm. Şərtlər barədə danışa bilərikmi?')

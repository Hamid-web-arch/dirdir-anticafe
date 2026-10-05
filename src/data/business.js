// Bütün real biznes məlumatları burada saxlanılır.
// Instagram (@dirdiranticafe) profilindən təsdiqlənib. Dəyişiklik olsa, yalnız
// bu faylı yeniləmək kifayətdir — bütün komponentlər buradan oxuyur.

import { PiDiceFive, PiFilmSlate, PiCookie, PiCalendarBlank, PiTeaBag, PiCoffee, PiPintGlass, PiArmchair, PiFlagCheckered, PiGift } from 'react-icons/pi'
import cinemaImg from '../assets/cinema.jpeg'
import hallImg from '../assets/upper-hal.jpeg'
import racingImg from '../assets/racing.jpeg'
import clawImg from '../assets/oyuncaq-aparati.jpeg'
import menuImg from '../assets/test.jpeg'

export const business = {
  name: 'DırDır Anticafe',
  instagramHandle: '@dirdiranticafe',
  instagramUrl: 'https://www.instagram.com/dirdiranticafe/',
  // WhatsApp nömrəsi: yalnız rəqəmlər, ölkə kodu ilə, + olmadan (məs. '994501234567').
  // Boş qalsa, "Rezerv et" düymələri Instagram-a yönləndirir.
  whatsappNumber: '994775530305',
  whatsappMessage: 'Salam! DırDır Anticafe-də kino otağını rezerv etmək istəyirəm. _Vaxt aralığı_ üçün otaq boşdurmu?',
  pricePerHour: 4,
  currency: '₼',
  // Qiymət cədvəli (Instagram "Qiymət" story-sindən). Hesablayıcı buradan oxuyur.
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
  },
  // Tələbə endirimi (yalnız zalda): minHours saat və daha çox qalanda percent faiz.
  studentDiscount: { percent: 20, minHours: 3 },
  // Promokodlar: KOD: endirim faizi. Böyük/kiçik hərf fərq etmir.
  // Endirimlər toplanmır — tələbə endirimi ilə promokoddan hansı böyükdürsə, o tətbiq olunur.
  promoCodes: {
    DIRDIR10: 10, // NÜMUNƏ — real kodla əvəz et
  },
  // Hesablayıcıdakı slayderlərin hədləri (hər rejim üçün)
  calculator: {
    hall: { people: { min: 1, max: 20 }, hours: { min: 1, max: 12, step: 0.5 } },
    room: { people: { min: 1, max: 8 }, hours: { min: 1, max: 12, step: 1 } },
  },
  hours: '11:00 – 23:00',
  address: 'Sahil m., Zərifə Əliyeva pr. 21/9, Bakı',
  reservation: 'Instagram DM üzərindən',
  mapEmbedUrl:
    'https://www.google.com/maps?q=Dir+Dir+Anticafe,40.3705961,49.8420727&z=17&output=embed',
  mapUrl: 'https://maps.app.goo.gl/ELRPJtAMzjBzA2yH9',
  included: ['Limitsiz çay', 'Limitsiz kofe', 'Limitsiz şirniyyat', 'Sərin içkilər', 'Stolüstü oyunlar'],
  amenities: [
    { icon: PiDiceFive, title: 'Stolüstü oyun kolleksiyası', desc: 'İstədiyin qədər oyna, əlavə haqq yoxdur — saat haqqına daxildir.' },
    { icon: PiFilmSlate, title: 'Kino otağı', desc: 'Ayrıca kino otağında rahat film izləmə imkanı.' },
    { icon: PiCookie, title: 'Squid Game Dalgona şəkəri', desc: 'Instagram profilində qeyd olunan xüsusi aktivlik — güncəl tarixlər üçün profilə bax.' },
    { icon: PiCalendarBlank, title: 'Rezervasiya', desc: 'Yer və qrup rezervasiyası üçün Instagram-dan DM yazmaq kifayətdir.' },
  ],
  menuCategories: [
    { icon: PiTeaBag, title: 'Çay', note: 'İstədiyin qədər, limitsiz' },
    { icon: PiCoffee, title: 'Kofe', note: 'İstədiyin qədər, limitsiz' },
    { icon: PiCookie, title: 'Şirniyyat', note: 'Limitsiz atışdırmalıq' },
    { icon: PiPintGlass, title: 'Sərin içkilər', note: 'Limitsiz seçim' },
  ],
  // "Nələr var?" slayderi — sıra burada necədirsə, saytda da elədir.
  // Şəkillər src/assets/ qovluğundadır. link olmayan slaydda "Ətraflı bax" çıxmır.
  // fit: 'contain' — şəkil kəsilmədən tam göstərilir (üzərində yazı olan posterlər üçün).
  highlights: [
    {
      image: cinemaImg,
      icon: PiFilmSlate,
      tone: 'from-brand-purple to-brand-cyan',
      title: 'Kino otağı',
      desc: 'Ayrıca otaqda, böyük ekranda film izlə — çay, kofe və şirniyyat da yanında.',
      link: '/#events',
    },
    {
      image: hallImg,
      icon: PiArmchair,
      tone: 'from-brand-teal to-brand-cyan',
      title: 'Rahat zal',
      desc: 'Yumşaq divanlar, rəngli yastıqlar və stolüstü oyun rəfi — dostlarla oturmaq üçün.',
    },
    {
      image: racingImg,
      icon: PiFlagCheckered,
      tone: 'from-brand-pink to-brand-orange',
      title: 'Mini yarış treki',
      desc: 'İşıqforlu start xətti, maketlər və miniatür maşınlar — əsl trek atmosferi.',
    },
    {
      image: clawImg,
      icon: PiGift,
      tone: 'from-brand-cyan to-brand-purple',
      title: 'Oyuncaq aparatı',
      desc: 'Şansını sına, sevdiyin yumşaq oyuncağı qap.',
    },
    {
      image: menuImg,
      fit: 'contain',
      icon: PiCoffee,
      tone: 'from-brand-orange to-brand-yellow',
      title: '4₼-a nələr daxildir?',
      desc: 'Coca-Cola, Sprite, Fanta, çay, kofe, peçenye, kreker və şirniyyatlar — hamısı saat haqqına daxildir.',
      link: '/#menu',
    },
  ],
}

// "Rezerv et" linki: nömrə varsa WhatsApp (hazır mesajla), yoxdursa Instagram.
export const reserveUrl = business.whatsappNumber
  ? `https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(business.whatsappMessage)}`
  : business.instagramUrl

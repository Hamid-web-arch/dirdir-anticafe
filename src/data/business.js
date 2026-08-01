// Bütün real biznes məlumatları burada saxlanılır.
// Instagram (@dirdiranticafe) profilindən təsdiqlənib. Dəyişiklik olsa, yalnız
// bu faylı yeniləmək kifayətdir — bütün komponentlər buradan oxuyur.

import { PiDiceFive, PiFilmSlate, PiCookie, PiCalendarBlank, PiTeaBag, PiCoffee, PiPintGlass } from 'react-icons/pi'

export const business = {
  name: 'DırDır Anticafe',
  instagramHandle: '@dirdiranticafe',
  instagramUrl: 'https://www.instagram.com/dirdiranticafe/',
  pricePerHour: 4,
  currency: '₼',
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
}

import {
  PiTrophyBold,
  PiImagesBold,
  PiUsersThreeBold,
  PiTicketBold,
  PiCurrencyCircleDollarBold,
  PiDiceFiveBold,
  PiChatCircleTextBold,
  PiMegaphoneBold,
  PiPaintBrushBold,
  PiClipboardTextBold,
  PiUserGearBold,
  PiChartBarBold,
} from 'react-icons/pi'

// Admin paneldəki bölmələr. `to` həm ünvan, həm də icazə açarıdır — server/src/permissions.js ilə eyni.
// superOnly — icazə ilə verilmir, yalnız baş admin görür.
export const GROUPS = ['Gündəlik', 'İstifadəçilər', 'Sayt', 'İdarəetmə']

export const SECTIONS = [
  { to: 'hesabat', label: 'Günün hesabatı', icon: PiClipboardTextBold, group: 'Gündəlik' },
  { to: 'statistika', label: 'Statistika', icon: PiChartBarBold, group: 'Gündəlik' },
  { to: 'istifadeciler', label: 'İstifadəçilər', icon: PiUsersThreeBold, group: 'İstifadəçilər' },
  { to: 'yarislar', label: 'Yarışlar', icon: PiTrophyBold, group: 'İstifadəçilər' },
  { to: 'xeberler', label: 'Xəbər göndər', icon: PiMegaphoneBold, group: 'İstifadəçilər' },
  { to: 'reyler', label: 'Rəylər', icon: PiChatCircleTextBold, badge: 'feedback', group: 'İstifadəçilər' },
  { to: 'qiymetler', label: 'Qiymətlər', icon: PiCurrencyCircleDollarBold, group: 'Sayt' },
  { to: 'promokodlar', label: 'Promokodlar', icon: PiTicketBold, group: 'Sayt' },
  { to: 'oyunlar', label: 'Oyunlar', icon: PiDiceFiveBold, group: 'Sayt' },
  { to: 'slider', label: 'Slider', icon: PiImagesBold, group: 'Sayt' },
  { to: 'gorunus', label: 'Görünüş', icon: PiPaintBrushBold, group: 'Sayt' },
  { to: 'adminler', label: 'Adminlər', icon: PiUserGearBold, group: 'İdarəetmə', superOnly: true },
]

// Baş adminə verilə bilən icazələr (Adminlər bölməsindəki seçim siyahısı)
export const PERMISSION_SECTIONS = SECTIONS.filter((s) => !s.superOnly)

// Bu admin bu bölməni görə bilərmi?
export const canSee = (user, section) =>
  user?.role === 'ADMIN' && (user.isSuperAdmin || (!section.superOnly && (user.permissions ?? []).includes(section.to)))

export const visibleSections = (user) => SECTIONS.filter((s) => canSee(user, s))

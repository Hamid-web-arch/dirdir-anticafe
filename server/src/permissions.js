import { HttpError } from './middleware/error.js'

// Admin paneldəki bölmələr — hər biri ayrıca icazədir. Açarlar saytdakı bölmə ünvanları ilə eynidir
// (src/pages/admin/sections.js): baş admin kimə hansı bölməni açacağını seçir.
// "Adminlər" bölməsi icazə ilə verilmir — yalnız baş admin (isSuperAdmin) görür.
export const ADMIN_PERMISSIONS = [
  'hesabat', // Günün hesabatı
  'statistika', // Statistika (günlük / aylıq qrafiklər)
  'istifadeciler', // İstifadəçilər
  'yarislar', // Yarışlar
  'xeberler', // Xəbər göndər
  'reyler', // Rəylər
  'qiymetler', // Qiymətlər
  'promokodlar', // Promokodlar
  'oyunlar', // Oyunlar
  'slider', // Slider
  'gorunus', // Görünüş
  'carx', // Hədiyyə çarxı (hədiyyələr, müddət, qazananlar)
  'club', // DırDır Club (statuslar, endirimlər, hədiyyələr)
]

// Baş admin hər şeyə icazəlidir; digər admin yalnız ona verilən bölmələrə
export const hasPermission = (user, key) =>
  user?.role === 'ADMIN' && (user.isSuperAdmin || (user.permissions ?? []).includes(key))

// Bu bölmələrdən heç olmasa birinə icazə lazımdır (məs. istifadəçi axtarışı həm "İstifadəçilər",
// həm "Günün hesabatı" üçün lazımdır). requireAdmin-dən sonra işləyir.
export const requirePermission =
  (...keys) =>
  (req, res, next) => {
    if (!keys.some((key) => hasPermission(req.user, key))) {
      throw new HttpError(403, 'FORBIDDEN', 'Bu bölmə üçün icazən yoxdur. Baş adminə müraciət et.')
    }
    next()
  }

export function requireSuperAdmin(req, res, next) {
  if (!(req.user?.role === 'ADMIN' && req.user.isSuperAdmin)) {
    throw new HttpError(403, 'FORBIDDEN', 'Adminləri yalnız baş admin idarə edə bilər.')
  }
  next()
}

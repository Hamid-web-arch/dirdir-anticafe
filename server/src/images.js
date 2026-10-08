import express from 'express'
import sharp from 'sharp'
import { prisma } from './db.js'
import { HttpError } from './middleware/error.js'

// Yüklənən şəkillər üçün: istənilən formatı qəbul edir, kiçildib WebP-yə çevirir.
export const rawImage = express.raw({ type: 'image/*', limit: '10mb' })

const PRESETS = {
  // Slider: eni ən çox 1600px, nisbət saxlanır
  slide: (img) => img.resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }),
  // Profil şəkli: 256×256 kvadrat, mərkəzdən kəsilir
  avatar: (img) => img.resize({ width: 256, height: 256, fit: 'cover', position: 'attention' }),
}

export async function processImage(buffer, preset) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new HttpError(400, 'IMAGE_INVALID', 'Şəkil faylı göndərilməyib.')
  }
  try {
    // rotate(): telefon şəkillərindəki EXIF istiqamətini tətbiq edir (yan düşməsin)
    const { data, info } = await PRESETS[preset](sharp(buffer).rotate())
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true })
    return { mime: 'image/webp', data, width: info.width, height: info.height, size: data.length }
  } catch {
    throw new HttpError(400, 'IMAGE_INVALID', 'Bu fayl şəkil deyil və ya zədəlidir.')
  }
}

export const imageUrl = (id) => (id ? `/api/images/${id}` : null)

// Şəkil id-si dəyişmir (əvəz etmək = yeni şəkil), ona görə brauzer onu həmişəlik keşləyə bilər.
export async function serveImage(req, res) {
  const image = await prisma.image.findUnique({
    where: { id: req.params.id },
    select: { mime: true, data: true },
  })
  if (!image) throw new HttpError(404, 'NOT_FOUND', 'Şəkil tapılmadı.')
  res.set({
    'Content-Type': image.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
  res.send(Buffer.from(image.data))
}

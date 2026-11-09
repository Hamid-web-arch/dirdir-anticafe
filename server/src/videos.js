import express from 'express'
import { prisma } from './db.js'
import { HttpError } from './middleware/error.js'

// Ana səhifənin fon videosu: admin paneldən yüklənir, bazada saxlanır.
// Serverdə video sıxılmır (ffmpeg yoxdur) — ona görə ölçü həddi var; admin qısa, sıxılmış MP4 yükləməlidir.
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024
export const rawVideo = express.raw({ type: 'video/*', limit: MAX_VIDEO_BYTES })

// Faylın özünə baxırıq (Content-Type-a yox): MP4/MOV — 4-cü baytdan "ftyp", WebM — 1A 45 DF A3
export function videoMime(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null
  if (buffer.toString('latin1', 4, 8) === 'ftyp') return buffer.toString('latin1', 8, 12) === 'qt  ' ? 'video/quicktime' : 'video/mp4'
  if (buffer.readUInt32BE(0) === 0x1a45dfa3) return 'video/webm'
  return null
}

export function checkVideo(buffer) {
  const mime = videoMime(buffer)
  if (!mime) throw new HttpError(400, 'VIDEO_INVALID', 'Yalnız MP4, MOV və ya WebM video yüklə.')
  return { mime, data: buffer, size: buffer.length }
}

export const videoUrl = (id) => (id ? `/api/videos/${id}` : null)

// Video hər sorğuda bazadan oxunmasın — sonuncu bir neçəsi yaddaşda saxlanır (id dəyişmir, köhnəlmir)
const memory = new Map()
async function loadVideo(id) {
  if (memory.has(id)) return memory.get(id)
  const video = await prisma.video.findUnique({ where: { id }, select: { mime: true, data: true } })
  if (!video) return null
  const entry = { mime: video.mime, data: Buffer.from(video.data) }
  memory.set(id, entry)
  if (memory.size > 2) memory.delete(memory.keys().next().value)
  return entry
}

// Brauzerlər (xüsusən iPhone Safari) videonu hissə-hissə istəyir: "Range: bytes=0-1" — 206 cavabı lazımdır
export async function serveVideo(req, res) {
  const video = await loadVideo(req.params.id)
  if (!video) throw new HttpError(404, 'NOT_FOUND', 'Video tapılmadı.')
  const total = video.data.length
  res.set({
    'Content-Type': video.mime,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
  })

  const match = /^bytes=(\d*)-(\d*)$/.exec(req.get('range') ?? '')
  if (!match || (match[1] === '' && match[2] === '')) {
    res.set('Content-Length', String(total))
    return res.send(video.data)
  }
  // "bytes=500-" — 500-dən sona; "bytes=-500" — son 500 bayt
  let start = match[1] === '' ? total - Number(match[2]) : Number(match[1])
  let end = match[1] === '' || match[2] === '' ? total - 1 : Math.min(Number(match[2]), total - 1)
  start = Math.max(0, start)
  if (start > end || start >= total) {
    res.set('Content-Range', `bytes */${total}`)
    return res.status(416).end()
  }
  res.status(206).set({ 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1) })
  res.send(video.data.subarray(start, end + 1))
}

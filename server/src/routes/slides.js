import { Router } from 'express'
import { prisma } from '../db.js'
import { imageUrl } from '../images.js'
import { HttpError } from '../middleware/error.js'

export const slidesRouter = Router()

const hasText = (texts) => Boolean(texts && Object.values(texts).some((v) => typeof v === 'string' && v.trim()))

// Siyahıda uzun mətn göndərmirik — yalnız "ətraflı səhifəsi var" işarəsi.
export const publicSlide = (s, { withBody = false } = {}) => ({
  id: s.id,
  position: s.position,
  imageUrl: imageUrl(s.imageId),
  fit: s.fit,
  title: s.title,
  desc: s.desc,
  hasDetails: hasText(s.body),
  ...(withBody ? { body: s.body ?? {} } : {}),
  link: s.link,
  active: s.active,
})

// Saytdakı "Nələr var?" slayderi — yalnız aktiv slaydlar, sıra ilə.
slidesRouter.get('/', async (req, res) => {
  const slides = await prisma.slide.findMany({ where: { active: true }, orderBy: { position: 'asc' } })
  res.json({ slides: slides.map((s) => publicSlide(s)) })
})

// "Ətraflı" səhifəsi
slidesRouter.get('/:id', async (req, res) => {
  const slide = await prisma.slide.findFirst({ where: { id: req.params.id, active: true } })
  if (!slide) throw new HttpError(404, 'NOT_FOUND', 'Səhifə tapılmadı.')
  res.json({ slide: publicSlide(slide, { withBody: true }) })
})

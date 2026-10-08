// Bazanın ilkin məlumatları. Canlıda hər server başlanğıcında işləyir (`npm run start:prod`).
//
// 1) Admin: ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE varsa, hesabı yaradır (və ya mövcud hesabı admin edir).
//    Hesab artıq varsa şifrəsinə toxunulmur — ADMIN_PASSWORD-u sonradan dəyişmək şifrəni dəyişmir.
//    --if-configured: dəyişənlər yoxdursa admin addımını səssizcə keçir.
// 2) Slider: standart 5 slaydı yalnız BİR DƏFƏ əlavə edir. Admin sonra hamısını silsə, geri qayıtmır.
import { readFile } from 'node:fs/promises'
import { prisma } from '../src/db.js'
import { hashPassword } from '../src/auth.js'
import { registerSchema } from '../src/validation.js'
import { processImage } from '../src/images.js'

async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_PHONE, ADMIN_FIRST_NAME = 'Admin', ADMIN_LAST_NAME = 'DırDır' } =
    process.env

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_PHONE) {
    if (!process.argv.includes('--if-configured')) {
      console.warn('ADMIN_EMAIL, ADMIN_PASSWORD və ADMIN_PHONE təyin olunmayıb — admin addımı keçildi.')
    }
    return
  }

  const data = registerSchema.parse({
    firstName: ADMIN_FIRST_NAME,
    lastName: ADMIN_LAST_NAME,
    email: ADMIN_EMAIL,
    phone: ADMIN_PHONE,
    password: ADMIN_PASSWORD,
  })

  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } })
      console.log(`${data.email} admin edildi.`)
    }
  } else {
    const { password, ...rest } = data
    await prisma.user.create({ data: { ...rest, role: 'ADMIN', passwordHash: await hashPassword(password) } })
    console.log(`Admin yaradıldı: ${data.email}`)
  }
}

const DEFAULT_SLIDES = [
  {
    file: 'cinema.webp',
    link: '/#events',
    title: { az: 'Kino otağı', en: 'Cinema room', ru: 'Кинозал' },
    desc: {
      az: 'Ayrıca otaqda, böyük ekranda film izlə — çay, kofe və şirniyyat da yanında.',
      en: 'Watch films on a big screen in a private room — with tea, coffee and sweets close at hand.',
      ru: 'Смотрите фильмы на большом экране в отдельной комнате — с чаем, кофе и сладостями.',
    },
  },
  {
    file: 'hall.webp',
    title: { az: 'Rahat zal', en: 'Cozy hall', ru: 'Уютный зал' },
    desc: {
      az: 'Yumşaq divanlar, rəngli yastıqlar və stolüstü oyun rəfi — dostlarla oturmaq üçün.',
      en: 'Soft sofas, colourful cushions and a shelf of board games — made for hanging out with friends.',
      ru: 'Мягкие диваны, яркие подушки и полка настольных игр — для встреч с друзьями.',
    },
  },
  {
    file: 'racing.webp',
    title: { az: 'Mini yarış treki', en: 'Mini race track', ru: 'Мини-гоночный трек' },
    desc: {
      az: 'İşıqforlu start xətti, maketlər və miniatür maşınlar — əsl trek atmosferi.',
      en: 'A start line with traffic lights, scenery and miniature cars — a real racetrack vibe.',
      ru: 'Старт со светофором, декорации и миниатюрные машинки — настоящая атмосфера трека.',
    },
  },
  {
    file: 'claw.webp',
    title: { az: 'Oyuncaq aparatı', en: 'Claw machine', ru: 'Автомат с игрушками' },
    desc: {
      az: 'Şansını sına, sevdiyin yumşaq oyuncağı qap.',
      en: 'Try your luck and grab your favourite plush toy.',
      ru: 'Испытайте удачу и вытащите любимую мягкую игрушку.',
    },
  },
  {
    file: 'menu.webp',
    fit: 'contain',
    link: '/#menu',
    title: { az: '4₼-a nələr daxildir?', en: 'What does 4₼ include?', ru: 'Что входит в 4₼?' },
    desc: {
      az: 'Coca-Cola, Sprite, Fanta, çay, kofe, peçenye, kreker və şirniyyatlar — hamısı saat haqqına daxildir.',
      en: 'Coca-Cola, Sprite, Fanta, tea, coffee, cookies, crackers and sweets — all included in the hourly price.',
      ru: 'Coca-Cola, Sprite, Fanta, чай, кофе, печенье, крекеры и сладости — всё входит в почасовую оплату.',
    },
  },
]

async function seedSlides() {
  const done = await prisma.appSetting.findUnique({ where: { key: 'defaultSlidesSeeded' } })
  if (done) return

  for (const [position, s] of DEFAULT_SLIDES.entries()) {
    const buffer = await readFile(new URL(`./seed-assets/${s.file}`, import.meta.url))
    const image = await prisma.image.create({ data: await processImage(buffer, 'slide') })
    await prisma.slide.create({
      data: { position, imageId: image.id, fit: s.fit ?? 'cover', title: s.title, desc: s.desc, link: s.link ?? null },
    })
  }
  await prisma.appSetting.create({ data: { key: 'defaultSlidesSeeded', value: new Date().toISOString() } })
  console.log(`Standart slaydlar əlavə olundu: ${DEFAULT_SLIDES.length}`)
}

try {
  await seedAdmin()
  await seedSlides()
} finally {
  await prisma.$disconnect()
}

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import { prisma } from './db.js'
import { config } from './config.js'
import { sendMail } from './mail.js'
import { HttpError } from './middleware/error.js'

// Emailə göndərilən 6 rəqəmli birdəfəlik kodlar: qeydiyyatın təsdiqi (register) və şifrə bərpası (reset).
export const CODE_TTL_MINUTES = 15
export const MAX_ATTEMPTS = 5 // bu qədər səhvdən sonra kod etibarsızdır — yenisini istəmək lazımdır
export const RESEND_AFTER_SECONDS = 60 // yeni kodu ən tez bu qədər sonra göndəririk

const hashCode = (email, purpose, code) => createHmac('sha256', config.JWT_SECRET).update(`${purpose}:${email}:${code}`).digest('hex')

const sameHash = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

const TEMPLATES = {
  register: {
    az: (name) => ({
      subject: 'Qeydiyyat kodun — DırDır Anticafe',
      text: `Salam, ${name}!\n\nDırDır Anticafe-də qeydiyyatı tamamlamaq üçün bu kodu sayta yaz:\n{{code}}\nKod ${CODE_TTL_MINUTES} dəqiqə keçərlidir.\n\nQeydiyyatdan keçməmisənsə, bu məktuba fikir vermə — hesab yaranmayacaq.`,
    }),
    en: (name) => ({
      subject: 'Your sign-up code — DırDır Anticafe',
      text: `Hi ${name}!\n\nEnter this code on the site to finish signing up at DırDır Anticafe:\n{{code}}\nThe code is valid for ${CODE_TTL_MINUTES} minutes.\n\nIf you didn't sign up, just ignore this email — no account will be created.`,
    }),
    ru: (name) => ({
      subject: 'Код регистрации — DırDır Anticafe',
      text: `Привет, ${name}!\n\nЧтобы завершить регистрацию в DırDır Anticafe, введи этот код на сайте:\n{{code}}\nКод действует ${CODE_TTL_MINUTES} минут.\n\nЕсли ты не регистрировался, просто проигнорируй это письмо — аккаунт не будет создан.`,
    }),
  },
  reset: {
    az: (name) => ({
      subject: 'Şifrəni bərpa et — DırDır Anticafe',
      text: `Salam, ${name}!\n\nŞifrəni bərpa etmək üçün bu kodu sayta yaz:\n{{code}}\nKod ${CODE_TTL_MINUTES} dəqiqə keçərlidir.\n\nŞifrə bərpasını sən istəməmisənsə, bu məktuba fikir vermə — şifrən dəyişməyəcək.`,
    }),
    en: (name) => ({
      subject: 'Reset your password — DırDır Anticafe',
      text: `Hi ${name}!\n\nEnter this code on the site to reset your password:\n{{code}}\nThe code is valid for ${CODE_TTL_MINUTES} minutes.\n\nIf you didn't ask for this, ignore this email — your password won't change.`,
    }),
    ru: (name) => ({
      subject: 'Восстановление пароля — DırDır Anticafe',
      text: `Привет, ${name}!\n\nЧтобы восстановить пароль, введи этот код на сайте:\n{{code}}\nКод действует ${CODE_TTL_MINUTES} минут.\n\nЕсли ты не запрашивал восстановление, проигнорируй письмо — пароль не изменится.`,
    }),
  },
}

const FOOTER = {
  az: 'Bu avtomatik məktubdur, cavab yazma.',
  en: 'This is an automated email, please do not reply.',
  ru: 'Это автоматическое письмо, не отвечай на него.',
}

// Son kod (varsa) — yeni kod üçün gözləmə vaxtını yoxlamaq və təkrar göndərmək üçün
export const latestCode = (email, purpose) =>
  prisma.emailCode.findFirst({ where: { email, purpose }, orderBy: { createdAt: 'desc' } })

// Yeni kod yaradır (köhnələri silinir) və göndərir. data — qeydiyyatda gözləyən məlumatlar.
export async function issueCode({ email, purpose, name, lang = 'az', data }) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await prisma.$transaction([
    prisma.emailCode.deleteMany({ where: { OR: [{ email, purpose }, { expiresAt: { lt: new Date() } }] } }),
    prisma.emailCode.create({
      data: {
        email,
        purpose,
        codeHash: hashCode(email, purpose, code),
        data: data ?? undefined,
        expiresAt: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
      },
    }),
  ])
  const template = (TEMPLATES[purpose][lang] ?? TEMPLATES[purpose].az)(name)
  try {
    await sendMail({ to: email, ...template, code, footer: FOOTER[lang] ?? FOOTER.az })
  } catch (err) {
    console.error('Email göndərilmədi:', err.message)
    await prisma.emailCode.deleteMany({ where: { email, purpose } })
    throw new HttpError(502, 'EMAIL_FAILED', 'Məktubu göndərmək alınmadı. Bir az sonra yenidən yoxla.')
  }
}

// Yeni kodu tez-tez istəmək olmaz (məktub spamı olmasın)
export function assertCanResend(last) {
  if (last && Date.now() - last.createdAt.getTime() < RESEND_AFTER_SECONDS * 1000) {
    throw new HttpError(429, 'CODE_COOLDOWN', 'Yeni kodu bir dəqiqədən sonra istəyə bilərsən.')
  }
}

// Kodu yoxlayır. Düzgündürsa — qeydi qaytarır (çağıran sonra silir); səhvdirsə — cəhd sayılır.
export async function checkCode({ email, purpose, code }) {
  const record = await latestCode(email, purpose)
  if (!record || record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) {
    throw new HttpError(400, 'CODE_EXPIRED', 'Kodun vaxtı bitib — yeni kod istə.', {
      fields: { code: 'Kodun vaxtı bitib — yeni kod istə.' },
      fieldCodes: { code: 'CODE_EXPIRED' },
    })
  }
  if (!sameHash(record.codeHash, hashCode(email, purpose, code))) {
    await prisma.emailCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } })
    throw new HttpError(400, 'CODE_INVALID', 'Kod yanlışdır.', { fields: { code: 'Kod yanlışdır.' }, fieldCodes: { code: 'CODE_INVALID' } })
  }
  return record
}

export const consumeCodes = (email, purpose) => prisma.emailCode.deleteMany({ where: { email, purpose } })

// Formalar üçün kiçik köməkçilər.

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

// Azərbaycan mobil operator kodları (+994 XX ...) — server də eyni qaydanı yoxlayır.
export const OPERATOR_CODES = ['10', '50', '51', '55', '60', '70', '77', '99']
export const MIN_PASSWORD = 8

// İstifadəçinin yazdığı nömrədən 9 rəqəm: "+994 50…", "050…" → "50…"
export function phoneDigits(value) {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('994')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits.slice(0, 9)
}
export const isPhone = (digits) => digits.length === 9 && OPERATOR_CODES.includes(digits.slice(0, 2))

// "501234567" → "50 123 45 67"
export const formatPhone = (digits) =>
  [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean).join(' ')

// ?next=/arena — girişdən sonra qayıdılacaq səhifə. Yalnız saytın öz yolları ("//başqa.sayt" yox).
export const safeNext = (value, fallback = '/hesabim') =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : fallback

// Formanın xətaları dil dəyişəndə də düzgün göstərilsin deyə mətn yox, açar saxlanır:
// client: { email: { key: 'validation.email' } }; server xətası isə ApiError obyektidir.
export function fieldMessage(field, clientErrors, serverError, { t, fieldErrors }) {
  const own = clientErrors[field]
  if (own) return t(own.key, own.vars)
  return serverError ? fieldErrors(serverError)[field] : undefined
}

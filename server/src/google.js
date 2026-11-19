// "Google ilə davam et": brauzer Google-dan imzalı ID token (credential) alır, server onu Google-un özü ilə yoxlayır.
// Client ID gizli deyil (saytın kodunda da görünür) — Google Cloud Console → Credentials → OAuth client (Web).
// Render-də GOOGLE_CLIENT_ID dəyişəni ilə dəyişdirmək olar; boşdursa Google girişi söndürülüb.
import { HttpError } from './middleware/error.js'

// Saytın Google Client ID-si (gizli deyil). Render-də GOOGLE_CLIENT_ID ilə əvəz etmək olar.
const DEFAULT_CLIENT_ID = ''
export const googleClientId = () => process.env.GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID

const ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com'])

// Tokeni Google yoxlayır (imza, müddət). Testlərdə bu funksiya əvəz olunur (setGoogleVerifier).
let verifier = async (credential) => {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`)
  return res.ok ? res.json() : null
}
export const setGoogleVerifier = (fn) => {
  verifier = fn
}

// → { sub, email, firstName, lastName } və ya 401
export async function verifyGoogleCredential(credential, clientId = googleClientId()) {
  if (!clientId) throw new HttpError(503, 'GOOGLE_OFF', 'Google ilə giriş hələ qurulmayıb.')
  let info = null
  try {
    info = await verifier(credential)
  } catch {
    info = null
  }
  const verified = info?.email_verified === true || info?.email_verified === 'true'
  const fresh = Number(info?.exp) * 1000 > Date.now()
  if (!info || info.aud !== clientId || !ISSUERS.has(info.iss) || !fresh || !verified || !info.email || !info.sub) {
    throw new HttpError(401, 'GOOGLE_INVALID', 'Google ilə giriş alınmadı — yenidən cəhd et.')
  }
  const name = String(info.name ?? '').trim()
  return {
    sub: String(info.sub),
    email: String(info.email).toLowerCase(),
    firstName: String(info.given_name ?? name.split(' ')[0] ?? '').trim().slice(0, 50) || 'Qonaq',
    lastName: String(info.family_name ?? name.split(' ').slice(1).join(' ') ?? '').trim().slice(0, 50) || '-',
  }
}

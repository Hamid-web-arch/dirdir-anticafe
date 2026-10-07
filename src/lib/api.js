// Backend ilə əlaqə. VITE_API_URL təyin olunmayıbsa (məs. backend hələ deploy olunmayıb),
// sayt demo rejimdə işləyir: formalar yalnız yoxlayır, Arena nümunə lövhəni göstərir.
const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export const apiEnabled = Boolean(API_URL)

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields ?? {}
  }
}

export async function api(path, { method = 'GET', body, token } = {}) {
  let res
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Serverə qoşulmaq olmadı. İnterneti yoxla və yenidən cəhd et.')
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(res.status, data.error?.message ?? 'Xəta baş verdi.', data.error?.fields)
  }
  return data
}

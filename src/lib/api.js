// Backend ilə əlaqə. VITE_API_URL təyin olunmayıbsa (məs. backend hələ deploy olunmayıb),
// sayt demo rejimdə işləyir: formalar yalnız yoxlayır, Arena boş lövhəni göstərir.
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export const apiEnabled = Boolean(API_URL)

// Serverdəki şəkil yolu (/api/images/...) → tam ünvan
export const assetUrl = (path) => (path && path.startsWith('/') ? `${API_URL}${path}` : path)

export class ApiError extends Error {
  constructor(status, code, message, fields, fieldCodes) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields ?? {}
    this.fieldCodes = fieldCodes ?? {}
  }
}

// body: obyekt → JSON; File/Blob → faylın özü (şəkil yükləmə)
export async function api(path, { method = 'GET', body, token } = {}) {
  const isFile = typeof Blob !== 'undefined' && body instanceof Blob
  let res
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: {
        ...(body ? { 'Content-Type': isFile ? body.type || 'application/octet-stream' : 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? (isFile ? body : JSON.stringify(body)) : undefined,
    })
  } catch {
    throw new ApiError(0, 'NETWORK', 'Serverə qoşulmaq olmadı. İnterneti yoxla və yenidən cəhd et.')
  }

  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = data.error ?? {}
    throw new ApiError(res.status, e.code ?? 'SERVER_ERROR', e.message ?? 'Xəta baş verdi.', e.fields, e.fieldCodes)
  }
  return data
}

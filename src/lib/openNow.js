import { business } from '../data/business.js'

// İş saatları "11:00 – 23:00" → dəqiqə ilə; Bakı vaxtı (UTC+4) ilə indi açıqdırmı
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export function openStatus(now = new Date()) {
  const [from, to] = business.hours.split(/\s*[–-]\s*/)
  const baku = new Date(now.getTime() + 4 * 60 * 60 * 1000)
  const minutes = baku.getUTCHours() * 60 + baku.getUTCMinutes()
  const start = toMinutes(from)
  const end = toMinutes(to)
  // Gecə yarısından keçən iş saatları da (məs. 11:00 – 02:00) düzgün işləsin
  const open = end > start ? minutes >= start && minutes < end : minutes >= start || minutes < end
  return { open, opensAt: from, closesAt: to }
}

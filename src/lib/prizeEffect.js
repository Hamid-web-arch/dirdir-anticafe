// Hədiyyə çarxının hədiyyəsinin hesaba təsiri — adından anlaşılır.
// Serverdəki server/src/wheel.js → prizeEffect ilə eynidir — birini dəyişəndə o birini də dəyiş.
// "15% endirim" → { kind: 'percent', value: 15 }; "Kino 25% endirim" → yalnız kino otağında;
// "Pulsuz 30 dəq" / "Pulsuz 1 saat" → { kind: 'minutes', value: 30 | 60 } (zalda, ilk saatın qiyməti ilə);
// qalanları (çay, desert…) → { kind: 'gift' } — hesaba təsir etmir, sadəcə verilir.
export function prizeEffect(prize) {
  const text = String(prize?.az ?? '').toLowerCase()
  const room = /kino/.test(text)
  const percent = text.match(/(\d+(?:[.,]\d+)?)\s*%/)
  if (percent) return { kind: 'percent', value: Math.min(100, Number(percent[1].replace(',', '.'))), only: room ? 'room' : null }
  const minutes = text.match(/(\d+)\s*(dəq|deq|dəqiqə)/)
  if (minutes) return { kind: 'minutes', value: Number(minutes[1]), only: 'hall' }
  const hours = text.match(/(\d+(?:[.,]\d+)?)\s*saat/)
  if (hours) return { kind: 'minutes', value: Math.round(Number(hours[1].replace(',', '.')) * 60), only: 'hall' }
  return { kind: 'gift', value: 0, only: null }
}

// Adminə qısa izah: "15% endirim · zal və kino", "30 dəq pulsuz · yalnız zal", "hədiyyə (hesaba təsir etmir)"
export function effectText(effect) {
  const where = effect.only === 'room' ? 'yalnız kino' : effect.only === 'hall' ? 'yalnız zal' : 'zal və kino'
  if (effect.kind === 'percent') return `${effect.value}% endirim · ${where}`
  if (effect.kind === 'minutes') return `${effect.value} dəq pulsuz · ${where}`
  return 'sadə hədiyyə — hesaba təsir etmir, "Verildi" ilə verilir'
}

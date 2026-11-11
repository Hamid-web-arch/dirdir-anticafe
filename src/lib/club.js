// DırDır Club statuslarının rəngləri (admin hər statusa bir rəng seçir — server/src/club.js → TIER_COLORS).
// Siniflər tam yazılıb ki, Tailwind onları tapıb CSS-ə daxil etsin.
export const TIER_STYLE = {
  teal: { soft: 'bg-brand-teal-soft', text: 'text-brand-teal-deep', solid: 'bg-brand-teal', border: 'border-brand-teal' },
  purple: { soft: 'bg-brand-purple-soft', text: 'text-brand-purple-deep', solid: 'bg-brand-purple', border: 'border-brand-purple' },
  orange: { soft: 'bg-brand-orange-soft', text: 'text-brand-orange-deep', solid: 'bg-brand-orange', border: 'border-brand-orange' },
  pink: { soft: 'bg-brand-pink-soft', text: 'text-brand-pink-deep', solid: 'bg-brand-pink', border: 'border-brand-pink' },
  yellow: { soft: 'bg-brand-yellow-soft', text: 'text-brand-yellow-deep', solid: 'bg-brand-yellow', border: 'border-brand-yellow' },
  cyan: { soft: 'bg-brand-cyan-soft', text: 'text-brand-cyan-deep', solid: 'bg-brand-cyan', border: 'border-brand-cyan' },
}

export const tierStyle = (color) => TIER_STYLE[color] ?? TIER_STYLE.orange

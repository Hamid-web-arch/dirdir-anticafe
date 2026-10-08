// "Rezerv et" düyməsi və onun arxasında gizlənən pişik (animasiya: index.css → .reserve-*).
// Pəncələr düyməni yuxarıdan tutur, arxadan baş görünür, altdan quyruq sallanır.
// Ağ pişik + qəhvəyi kontur: həm açıq/tünd fonda, həm narıncı düymənin üstündə görünür.
const FUR = '#FFFFFF'
const LINE = '#6B5A52'
const PINK = '#FF8FA8'

// Düymənin özü: pişik onun ətrafındadır. Düymə üçün sinifləri `className` ilə ver.
export default function ReserveButton({ href, className, wrapClassName = 'inline-flex', label, children, onClick }) {
  return (
    <span className={`reserve-wrap ${wrapClassName}`}>
      <CatHead />
      <CatTail />
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} onClick={onClick} className={`reserve-cta ${className}`}>
        {children}
      </a>
      <span className="reserve-paw reserve-paw-left" aria-hidden>
        <Paw />
      </span>
      <span className="reserve-paw reserve-paw-right" aria-hidden>
        <Paw />
      </span>
    </span>
  )
}

// Düymənin yuxarı kənarından aşan barmaqlar (yuxarıdan baxış)
function Paw() {
  return (
    <svg viewBox="0 0 26 16" width="17" height="11">
      <path
        d="M2 15 C1 7 4 2 8 3 C9 0.5 12 0 13 2 C14 0 17 0.5 18 3 C22 2 25 7 24 15 Z"
        fill={FUR}
        stroke={LINE}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8.5 4 V9 M13 2.5 V8.5 M17.5 4 V9" stroke={LINE} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// Düymənin arxasından görünən baş: qulaqlar, gözlər, burun, bığlar
function CatHead() {
  return (
    <span className="reserve-head" aria-hidden>
      <svg viewBox="0 0 60 44" width="38" height="28">
        {/* qulaqlar */}
        <path d="M9 24 L7 3 L24 13 Z" fill={FUR} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M51 24 L53 3 L36 13 Z" fill={FUR} stroke={LINE} strokeWidth="2" strokeLinejoin="round" />
        <path d="M11 18 L10 8 L19 13 Z" fill={PINK} />
        <path d="M49 18 L50 8 L41 13 Z" fill={PINK} />
        {/* baş (alt hissəsi düymənin arxasında qalır) */}
        <ellipse cx="30" cy="32" rx="24" ry="20" fill={FUR} stroke={LINE} strokeWidth="2" />
        {/* gözlər — göz qırpanda yığılır */}
        <g className="reserve-eyes">
          <ellipse cx="21" cy="29" rx="3.2" ry="4" fill={LINE} />
          <ellipse cx="39" cy="29" rx="3.2" ry="4" fill={LINE} />
          <circle cx="22" cy="27.5" r="1.1" fill={FUR} />
          <circle cx="40" cy="27.5" r="1.1" fill={FUR} />
        </g>
        {/* burun və bığlar */}
        <path d="M27.5 36 H32.5 L30 38.5 Z" fill={PINK} stroke={LINE} strokeWidth="0.8" strokeLinejoin="round" />
        <path d="M14 35 L4 33 M14 38 L4 39 M46 35 L56 33 M46 38 L56 39" stroke={LINE} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </span>
  )
}

// Düymənin altından sallanan quyruq (yuxarı ucu düymənin arxasındadır)
function CatTail() {
  const d = 'M10 2 C10 14 4 20 6 30 C8 38 16 38 15 31'
  return (
    <span className="reserve-tail" aria-hidden>
      <svg viewBox="0 0 22 42" width="15" height="29">
        <path d={d} fill="none" stroke={LINE} strokeWidth="8" strokeLinecap="round" />
        <path d={d} fill="none" stroke={FUR} strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

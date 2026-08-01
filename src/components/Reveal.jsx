import { useEffect, useRef, useState } from 'react'

const OFFSETS = {
  up: 'translate-y-4',
  down: '-translate-y-4',
  left: 'translate-x-4',
  right: '-translate-x-4',
  none: '',
}

// Wrap any block with <Reveal> to fade+slide it in when it scrolls into view.
// direction: 'up' | 'down' | 'left' | 'right' | 'none' — subtle 1rem offset, minimalist by design.
// delay: ms, use to stagger items inside a mapped list (e.g. delay={i * 70}).
export default function Reveal({ children, className = '', direction = 'up', delay = 0 }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-x-0 translate-y-0' : `opacity-0 ${OFFSETS[direction]}`
      } ${className}`}
    >
      {children}
    </div>
  )
}

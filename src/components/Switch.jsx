// Sağa-sola sürüşən açar (iOS üslubu). Qaranlıq rejim, "yeniliklərdən xəbərdar ol" və s. üçün.
// children verilərsə, açarın yanında mətn kimi göstərilir və mətnə basmaq da açarı dəyişir.
export default function Switch({ checked, onChange, label, children, icon, disabled, size = 'md' }) {
  const s = size === 'sm' ? { track: 'w-11 h-6', knob: 'w-5 h-5', on: 'translate-x-5' } : { track: 'w-[52px] h-7', knob: 'w-6 h-6', on: 'translate-x-6' }

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={children ? undefined : label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 disabled:opacity-50 ${s.track} ${
        checked ? 'bg-ink' : 'bg-ink/20'
      }`}
    >
      <span
        className={`flex items-center justify-center rounded-full bg-card shadow-md transition-transform duration-200 text-ink ${s.knob} ${
          checked ? s.on : 'translate-x-0'
        }`}
      >
        {icon}
      </span>
    </button>
  )

  if (!children) return button
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      {button}
      <span className="text-[0.92rem] font-semibold leading-snug">{children}</span>
    </label>
  )
}

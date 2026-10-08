import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import az from './az.js'
import en from './en.js'
import ru from './ru.js'

export const LANGUAGES = ['az', 'en', 'ru']
const DICTIONARIES = { az, en, ru }
// Rəqəm, tarix və say formaları üçün
const LOCALES = { az: 'az-Latn-AZ', en: 'en-GB', ru: 'ru-RU' }
const STORAGE_KEY = 'dirdir.lang'

function initialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (LANGUAGES.includes(saved)) return saved
  } catch {}
  // İlk gələndə brauzerin dilinə baxırıq; uyğun gəlməsə — azərbaycanca.
  const preferred = (typeof navigator !== 'undefined' && navigator.languages) || []
  for (const tag of preferred) {
    const code = tag.toLowerCase().split('-')[0]
    if (LANGUAGES.includes(code)) return code
  }
  return 'az'
}

// Bəzi brauzerlərdə (və telefonlarda) azərbaycanca ay adları yoxdur — "M10" çıxır.
// Ona görə az tarixlərini özümüz formatlayırıq.
const AZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr']
const pad = (n) => String(n).padStart(2, '0')

export function formatAzDate(value, options = {}) {
  const d = new Date(value)
  let month = AZ_MONTHS[d.getMonth()]
  if (options.month === 'short') month = month.slice(0, 3)
  let text = options.month ? `${options.day ? `${d.getDate()} ` : ''}${month}` : `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`
  if (options.year) text += ` ${d.getFullYear()}`
  if (options.hour) text += `, ${pad(d.getHours())}:${pad(d.getMinutes())}`
  return text
}

const lookup = (dict, key) => key.split('.').reduce((node, part) => (node == null ? node : node[part]), dict)

const interpolate = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] != null ? String(vars[name]) : match)) : text

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage)

  const setLang = useCallback((next) => {
    if (!LANGUAGES.includes(next)) return
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    // Səhifə başlığında qiymət var — onu PricingProvider qoyur (src/pricing/PricingContext.jsx)
  }, [lang])

  const value = useMemo(() => {
    const locale = LOCALES[lang]
    const plural = new Intl.PluralRules(locale)
    const number = (n, options) => Number(n).toLocaleString(locale, options)

    // t('calc.title'), t('hero.badge', { price: '4₼' }), t('units.hours', { count: 3 })
    // Tapılmayan açar az-a, o da yoxdursa açarın özünə qayıdır. Massiv/obyekt olduğu kimi qaytarılır.
    const t = (key, vars) => {
      let entry = lookup(DICTIONARIES[lang], key)
      if (entry == null) entry = lookup(az, key)
      if (entry == null) return key
      if (typeof entry === 'object' && !Array.isArray(entry) && vars?.count != null) {
        const form = entry[plural.select(vars.count)] ?? entry.other
        return interpolate(form, { ...vars, count: number(vars.count) })
      }
      return typeof entry === 'string' ? interpolate(entry, vars) : entry
    }

    // Serverdən gələn { az, en, ru } mətnlər: seçilmiş dil boşdursa az göstərilir.
    const pick = (texts) => (texts && (texts[lang] || texts.az)) || ''

    const date = (value, options = { day: 'numeric', month: 'long', year: 'numeric' }) =>
      lang === 'az' ? formatAzDate(value, options) : new Intl.DateTimeFormat(locale, options).format(new Date(value))

    // API xətası → istifadəçinin dilində mətn (kod tanınmasa serverin öz mesajı)
    const errorText = (err) => (err?.code && lookup(az.errors, err.code) ? t(`errors.${err.code}`) : err?.message)
    const fieldErrors = (err) =>
      Object.fromEntries(
        Object.entries(err?.fields ?? {}).map(([field, message]) => {
          const code = err.fieldCodes?.[field]
          return [field, code && lookup(az.errors, code) ? t(`errors.${code}`) : message]
        }),
      )

    return { lang, setLang, locale, t, pick, number, date, errorText, fieldErrors }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = () => useContext(I18nContext)

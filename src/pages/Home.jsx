import Hero from '../components/Hero.jsx'
import Highlights from '../components/Highlights.jsx'
import Calculator from '../components/Calculator.jsx'
import Pricing from '../components/Pricing.jsx'
import Menu from '../components/Menu.jsx'
import Events from '../components/Events.jsx'
import Contact from '../components/Contact.jsx'
import Feedback from '../components/Feedback.jsx'
import { business } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'
import { usePricing } from '../pricing/PricingContext.jsx'
import { useSeo } from '../lib/seo.js'

export default function Home() {
  const { t } = useI18n()
  // Başlıqda ilk saatın qiyməti var — admin qiyməti dəyişəndə başlıq da dəyişir
  const price = `${usePricing().hall.firstHour}${business.currency}`
  useSeo({ title: t('seo.home.title', { price }), description: t('seo.home.description', { price }) })

  return (
    <>
      <Hero />
      <Highlights />
      <Calculator />
      <Pricing />
      <Menu />
      <Events />
      <Feedback />
      <Contact />
    </>
  )
}

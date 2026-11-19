import { business, whatsappDisplay } from '../data/business.js'
import { useI18n } from '../i18n/index.jsx'
import { useSeo } from '../lib/seo.js'

// Məxfilik siyasəti: hansı məlumatı toplayırıq, nə üçün, kimlə paylaşırıq, necə silmək olar.
// Google ilə giriş (OAuth razılıq ekranı) üçün də bu səhifənin linki lazımdır: https://www.dirdir.az/mexfilik
const UPDATED = '2026-11-18'

const CONTENT = {
  az: {
    title: 'Məxfilik siyasəti',
    updated: 'Son yenilənmə',
    sections: [
      ['Kim', `${business.name} (Bakı, Sahil m.) saytı dirdir.az-ı idarə edir. Bu səhifə saytda topladığımız şəxsi məlumatları izah edir.`],
      ['Hansı məlumatları toplayırıq', 'Hesab açanda: ad, soyad, email, (könüllü) telefon nömrəsi və şifrə (yalnız şifrələnmiş şəkildə saxlanır). "Google ilə davam et" ilə girəndə Google bizə yalnız adını, soyadını və emailini göndərir — Google şifrəni görmürük. Kafedə ziyarətlərin (vaxt, məbləğ, ödəniş üsulu), DırDır Club statusun, hədiyyə çarxından qazandığın hədiyyələr və istəsən profil şəklin də saxlanır.'],
      ['Nə üçün istifadə edirik', 'Hesabına giriş, kafedə səni tanımaq (müştəri kodu), ziyarət və endirimlərini hesablamaq, hədiyyələri vermək və — razılıq versən — yeniliklər barədə xəbər göndərmək üçün. Məlumatlarını satmırıq və reklam üçün istifadə etmirik.'],
      ['Kimlə paylaşırıq', 'Yalnız saytın işləməsi üçün lazım olan xidmətlərlə: hostinq və baza (Vercel, Render, Neon), email göndərmə (Resend) və Google ilə giriş (Google). Onlar məlumatı yalnız bizim tapşırığımızla emal edir.'],
      ['Nə qədər saxlayırıq', 'Hesabın açıq olduğu müddətdə. Hesabını silməyi istəsən, məlumatların silinir (mühasibat üçün lazım olan ödəniş qeydləri adsız qala bilər).'],
      ['Sənin hüquqların', 'Məlumatlarına "Hesabım" səhifəsində baxıb dəyişə, xəbər bülletenindən imtina edə bilərsən. Hesabını silmək və ya məlumatların barədə sual üçün bizə yaz.'],
      ['Əlaqə', `WhatsApp: ${whatsappDisplay} · Instagram: ${business.instagramHandle}`],
    ],
  },
  en: {
    title: 'Privacy policy',
    updated: 'Last updated',
    sections: [
      ['Who we are', `${business.name} (Baku, Sahil metro) runs dirdir.az. This page explains the personal data we collect on the site.`],
      ['What we collect', 'When you create an account: first and last name, email, an optional phone number and a password (stored only in hashed form). With "Continue with Google", Google shares only your name and email with us — we never see your Google password. We also keep your café visits (time, amount, payment method), your DırDır Club status, gift wheel prizes and, if you add one, your profile photo.'],
      ['How we use it', 'To sign you in, recognise you at the café (customer code), calculate visits and discounts, give you prizes and — if you agree — send news. We never sell your data or use it for advertising.'],
      ['Who we share it with', 'Only services needed to run the site: hosting and database (Vercel, Render, Neon), email delivery (Resend) and Google sign-in (Google). They process data only on our behalf.'],
      ['How long we keep it', 'As long as your account exists. If you ask us to delete your account, your data is deleted (payment records needed for accounting may be kept without your name).'],
      ['Your rights', 'You can view and change your data on the "My account" page and unsubscribe from news. To delete your account or ask about your data, contact us.'],
      ['Contact', `WhatsApp: ${whatsappDisplay} · Instagram: ${business.instagramHandle}`],
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    updated: 'Последнее обновление',
    sections: [
      ['Кто мы', `${business.name} (Баку, м. Сахил) управляет сайтом dirdir.az. Здесь описано, какие персональные данные мы собираем на сайте.`],
      ['Что мы собираем', 'При регистрации: имя, фамилию, email, необязательный номер телефона и пароль (хранится только в зашифрованном виде). При входе через Google мы получаем только имя и email — пароль от Google мы не видим. Также сохраняются визиты в кафе (время, сумма, способ оплаты), статус DırDır Club, призы колеса подарков и, если добавишь, фото профиля.'],
      ['Зачем', 'Чтобы ты мог войти, мы узнавали тебя в кафе (код клиента), считали визиты и скидки, выдавали подарки и — с твоего согласия — присылали новости. Мы не продаём данные и не используем их для рекламы.'],
      ['С кем делимся', 'Только с сервисами, нужными для работы сайта: хостинг и база данных (Vercel, Render, Neon), отправка писем (Resend) и вход через Google (Google). Они обрабатывают данные только по нашему поручению.'],
      ['Сколько храним', 'Пока существует аккаунт. Если попросишь удалить аккаунт, данные будут удалены (записи об оплатах для учёта могут остаться без имени).'],
      ['Твои права', 'Данные можно посмотреть и изменить в разделе «Мой аккаунт», от новостей можно отписаться. Чтобы удалить аккаунт или задать вопрос о данных, напиши нам.'],
      ['Контакты', `WhatsApp: ${whatsappDisplay} · Instagram: ${business.instagramHandle}`],
    ],
  },
}

export default function Privacy() {
  const { lang, date } = useI18n()
  const c = CONTENT[lang] ?? CONTENT.az
  useSeo({ title: `${c.title} — ${business.name}` })

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[760px] mx-auto px-5 sm:px-7">
        <h1 className="font-display font-bold text-[2rem] sm:text-[2.5rem] leading-tight mb-2">{c.title}</h1>
        <p className="text-inkdim text-[0.9rem] mb-8">
          {c.updated}: {date(`${UPDATED}T12:00:00`)}
        </p>
        <div className="flex flex-col gap-6">
          {c.sections.map(([heading, text]) => (
            <div key={heading}>
              <h2 className="font-display font-bold text-[1.2rem] mb-1.5">{heading}</h2>
              <p className="text-inkdim leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

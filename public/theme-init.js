// Qaranlıq rejim: React yüklənməmiş tətbiq olunur ki, ekran yanıb-sönməsin (src/theme/ThemeContext.jsx).
// Ayrıca faylda saxlanır ki, saytın CSP qaydası (vercel.json) heç bir "inline" skriptə icazə verməsin.
try {
  var t = localStorage.getItem('dirdir.theme')
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  document.documentElement.dataset.theme = t
} catch (e) {}

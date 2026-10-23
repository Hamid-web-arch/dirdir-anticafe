import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Axtarış sistemləri üçün build zamanı: index.html-də __SITE_URL__ → saytın ünvanı,
// dist/robots.txt və dist/sitemap.xml (oyun və slayd səhifələri API-dən götürülür).
function seo(env) {
  const site = (env.VITE_SITE_URL || 'https://www.dirdir.az').replace(/\/$/, '')
  const api = env.VITE_API_URL?.replace(/\/$/, '')

  // Render-in pulsuz serveri yatmış ola bilər (oyanması ~30 san.) — 60 san. gözləyirik, cavab gəlməsə sitemap yalnız əsas səhifələrlə çıxır
  const fetchIds = async (path, key) => {
    if (!api) return []
    try {
      const res = await fetch(`${api}/api${path}`, { signal: AbortSignal.timeout(60_000) })
      return res.ok ? (await res.json())[key].map((item) => item.id) : []
    } catch {
      return []
    }
  }

  return {
    name: 'dirdir-seo',
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', site),
    async generateBundle() {
      const [games, slides] = await Promise.all([fetchIds('/games', 'games'), fetchIds('/slides', 'slides')])
      const pages = [
        { path: '/', priority: '1.0' },
        { path: '/oyunlar', priority: '0.8' },
        { path: '/arena', priority: '0.7' },
        { path: '/sponsorlar', priority: '0.4' },
        ...games.map((id) => ({ path: `/oyunlar/${id}`, priority: '0.6' })),
        ...slides.map((id) => ({ path: `/neler-var/${id}`, priority: '0.5' })),
      ]
      const urls = pages
        .map((p) => `  <url><loc>${site}${p.path}</loc><priority>${p.priority}</priority></url>`)
        .join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        // Giriş/qeydiyyat/hesab burada bağlanmır: Google onları açıb "noindex" teqini görməlidir
        source: `User-agent: *\nDisallow: /admin\n\nSitemap: ${site}/sitemap.xml\n`,
      })
    },
  }
}

// Sayt Vercel-də kök ünvandadır (/).
export default defineConfig(({ mode }) => ({
  plugins: [react(), seo(loadEnv(mode, process.cwd(), 'VITE_'))],
}))

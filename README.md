# DırDır Anticafe — React + Vite + Tailwind

Bakı-da yerləşən DırDır Anticafe üçün React əsaslı sayt.

## Quraşdırma

```bash
npm install
npm run dev
```

Brauzerdə `http://localhost:5173` açılacaq.

## Build (production)

```bash
npm run build
npm run preview
```

`dist/` qovluğu deploy üçün hazır statik fayllardan ibarət olacaq (Vercel, Netlify, GitHub Pages və s. üçün uyğundur).

## Struktur

```
src/
  App.jsx                → bütün bölmələri birləşdirir
  data/business.js        → REAL biznes məlumatları (qiymət, ünvan, saatlar, IG) — dəyişiklik üçün YALNIZ bu fayl kifayətdir
  components/
    Navbar.jsx
    Hero.jsx               → imza element: rəngarəng "spinner" SVG
    About.jsx
    Pricing.jsx
    Menu.jsx
    Events.jsx
    Contact.jsx             → xəritə + Instagram
    Footer.jsx
    Reveal.jsx              → scroll-a görə fade-in animasiya wrapper-i
```

## Rəng palitrası (tailwind.config.js → theme.colors.brand)

- `brand.pink`   #FF4F81
- `brand.purple` #7C5CFF
- `brand.yellow` #FFC839
- `brand.teal`   #00BFA6
- `bg` (fon)     #F5FBF6

Rəngləri dəyişmək üçün `tailwind.config.js` faylındakı `theme.extend.colors` bölməsini redaktə edin.

## Qeyd

`src/data/business.js` faylındakı bütün faktlar (qiymət, ünvan, iş saatları) Instagram bio-sundan (@dirdiranticafe) götürülüb. Menyu itemləri və tədbir cədvəli hazırda ümumi saxlanılıb, çünki dəqiq siyahı yalnız Instagram-ın özündə (story highlight-lar) mövcuddur — real fotoları/mətni versəniz, dəqiq məzmunla doldururuq.

## GitHub-a yükləmək

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <öz repo linkiniz>
git push -u origin main
```

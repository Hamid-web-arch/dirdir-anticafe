# DırDır Anticafe — API

Node.js + Express + PostgreSQL (Prisma). Saytın qeydiyyat/giriş, Arena xalları və promokodlarını idarə edir.

## Lokal işə salmaq

PostgreSQL quraşdırmaq lazım deyil — layihə öz daxili bazasını işə salır.

```bash
cd server
npm install
cp .env.example .env          # sonra JWT_SECRET və ADMIN_* dəyərlərini doldur
npm run db:local              # 1-ci terminal: PostgreSQL (açıq qalır)
npm run db:migrate            # 2-ci terminal: cədvəlləri yarat
npm run db:seed               # ilk admin hesabı (.env-dəki ADMIN_*)
npm run dev                   # API: http://localhost:4000/api/health
```

Frontend-i API-yə qoşmaq üçün layihənin kök qovluğunda `.env.development.local` faylı:

```
VITE_API_URL=http://localhost:4000
```

`VITE_API_URL` olmasa, sayt demo rejimdə işləyir: formalar yalnız yoxlayır, Arena nümunə lövhəni göstərir.

## Testlər

```bash
npm test
```

Testlər öz müvəqqəti PostgreSQL bazasını yaradıb sonda silir — dev bazasına toxunmur.

## API

Bütün xətalar eyni formadadır: `{ "error": { "message": "...", "fields": { "email": "..." } } }`.
Daxil olmaq tələb edən ünvanlara `Authorization: Bearer <token>` başlığı ilə müraciət olunur.

| Metod | Ünvan | Kim | Nə edir |
|---|---|---|---|
| GET | `/api/health` | hamı | Server və baza işləyir? |
| POST | `/api/auth/register` | hamı | `{ firstName, lastName, email, phone, password }` → `{ token, user }` |
| POST | `/api/auth/login` | hamı | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | istifadəçi | Öz profili |
| GET | `/api/arena/leaderboard?limit=10` | hamı | Lövhə (ad "Aysel M." formasında, email/telefon yoxdur) |
| GET | `/api/arena/me` | istifadəçi | Öz yeri və xalı |
| POST | `/api/promo/validate` | hamı | `{ code }` → `{ code, percent }` və ya 404 |
| GET | `/api/admin/users?q=` | admin | Ad/email/telefonla axtarış |
| POST | `/api/admin/users/:id/points` | admin | `{ amount, reason }` — xal ver (+) və ya çıx (−) |
| GET | `/api/admin/users/:id/points` | admin | Xal tarixçəsi |
| GET/POST | `/api/admin/promo-codes` | admin | Kodların siyahısı / yeni kod `{ code, percent, expiresAt? }` |
| PATCH/DELETE | `/api/admin/promo-codes/:id` | admin | Kodu dəyiş (məs. `{ active: false }`) / sil |

Təhlükəsizlik: şifrələr bcrypt ilə saxlanır; giriş (15 dəqiqədə 10), qeydiyyat və promokod yoxlaması üçün sorğu limiti var;
yalnız `CORS_ORIGINS`-dəki saytlar API-yə brauzerdən müraciət edə bilər.

## Canlıya çıxarmaq (məs. Render + Neon)

1. **Baza:** [neon.tech](https://neon.tech)-də pulsuz PostgreSQL yarat, bağlantı ünvanını (`postgresql://...`) götür.
2. **Server:** [render.com](https://render.com)-da *New → Web Service*, bu repo:
   - Root Directory: `server`
   - Build Command: `npm ci && npx prisma migrate deploy`
   - Start Command: `npm start`
   - Environment: `DATABASE_URL`, `JWT_SECRET` (uzun təsadüfi sətir), `CORS_ORIGINS=https://hamid-web-arch.github.io`, `NODE_ENV=production`
3. **Admin:** Render Shell-də `ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_PHONE=... npm run db:seed`.
4. **Frontend:** GitHub repo → Settings → Secrets and variables → Actions → **Variables** → `VITE_API_URL` = Render ünvanı
   (məs. `https://dirdir-api.onrender.com`), sonra `main`-ə push və ya workflow-u yenidən işə sal.

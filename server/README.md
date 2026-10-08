# DırDır Anticafe — API

Node.js + Express + PostgreSQL (Prisma). Saytın qeydiyyat/giriş, yarışlar, slayder, qiymətlər və promokodlarını idarə edir.

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
| POST | `/api/auth/login` | hamı | `{ login, password }` → `{ token, user }`; `login` — email və ya telefon nömrəsi (köhnə `email` sahəsi də qəbul olunur) |
| GET / PATCH | `/api/auth/me` | istifadəçi | Profil / ad, soyad, telefonu dəyiş |
| POST | `/api/auth/me/password` | istifadəçi | `{ currentPassword, newPassword }` |
| PUT / DELETE | `/api/auth/me/avatar` | istifadəçi | Profil şəkli (faylın özü, `Content-Type: image/*`) / sil |
| GET | `/api/auth/me/teams` | istifadəçi | Yarış tarixçəsi: komanda, xal, yer |
| GET | `/api/competitions` | hamı | Yarışlar (daxil olubsa — `myTeam`) |
| GET | `/api/competitions/:id?period=` | hamı | Yarış + komanda lövhəsi; `period`: `week` (bu həftə), `month` (bu ay), `all` (ümumi) — Bakı vaxtı ilə |
| POST / DELETE | `/api/competitions/:id/join` | istifadəçi | `{ teamName }` ilə qoşul / çıx (yalnız başlamamış yarışdan) |
| GET | `/api/slides` | hamı | Saytdakı slayder (aktiv slaydlar) |
| GET | `/api/pricing` | hamı | Qiymət cədvəli (zal, kino otağı, tələbə endirimi) |
| GET | `/api/slides/:id` | hamı | Slaydın "Ətraflı" səhifəsi (`body` — uzun mətn) |
| GET | `/api/games`, `/api/games/:id` | hamı | Oyunlar səhifəsi / bir oyun (`howTo` — necə oynanılır) |
| POST | `/api/feedback` | hamı | Rəy və təklif `{ name?, contact?, message }` |
| GET | `/api/site` | hamı | Admin paneldən dəyişən şəkillər (giriş / qeydiyyat) |
| GET | `/api/images/:id` | hamı | Şəkil (WebP, həmişəlik keşlənir) |
| POST | `/api/promo/validate` | hamı | `{ code }` → `{ code, percent }` və ya 404 |
| GET | `/api/admin/users` | admin | Axtarış `q` + filtrlər: `status` (active/blocked), `role`, `joined` (yes/no), `competitionId`, `sort` (new/old/name), `limit`, `offset` |
| GET | `/api/admin/users/:id` | admin | İstifadəçi + qoşulduğu yarışlar |
| POST | `/api/admin/users` | admin | Yeni hesab `{ firstName, lastName, email, phone, password, role }` (role: USER / ADMIN) |
| PATCH / DELETE | `/api/admin/users/:id` | admin | `{ blocked }` və/və ya `{ role }` — blokla, admin et / adminlikdən çıxar; sil (komandaları ilə). Admin öz hesabını dəyişə bilməz; admini bloklamaq/silmək üçün əvvəl adminlikdən çıxarmaq lazımdır |
| GET / PUT | `/api/admin/pricing` | admin | Qiymətləri oxu / dəyiş |
| GET / POST | `/api/admin/competitions` | admin | Yarışlar / yeni yarış (`title`, `description` — `{ az, en, ru }`) |
| PATCH / DELETE | `/api/admin/competitions/:id` | admin | Dəyiş (vəziyyət, qeydiyyat, limit) / sil |
| GET | `/api/admin/competitions/:id/teams` | admin | Komandalar və qeydiyyat edənin əlaqə məlumatı |
| POST / GET | `/api/admin/teams/:id/points` | admin | `{ amount, reason }` — xal ver (+) / çıx (−) / tarixçə |
| DELETE | `/api/admin/teams/:id` | admin | Komandanı yarışdan çıxar |
| POST | `/api/admin/images` | admin | Slayd şəkli yüklə (faylın özü) → `{ image: { id, url } }` |
| GET / POST | `/api/admin/slides` | admin | Bütün slaydlar / yeni slayd `{ imageId, title, desc, link?, fit, active }` |
| PATCH / DELETE | `/api/admin/slides/:id` | admin | Dəyiş (şəkli əvəz etmək daxil) / sil |
| PUT | `/api/admin/slides/order` | admin | `{ ids: [...] }` — yeni sıra |
| GET/POST/PATCH/DELETE | `/api/admin/promo-codes` | admin | Promokodlar |
| GET/POST/PATCH/DELETE | `/api/admin/games` (+ `PUT /games/order`) | admin | Oyunlar |
| GET / PATCH / DELETE | `/api/admin/feedback` | admin | Rəylər (`?status=unread`), oxundu et, sil |
| GET / PUT / DELETE | `/api/admin/site-images/:key` | admin | Giriş/qeydiyyat şəkli (`login`, `register`) |
| GET / POST | `/api/admin/broadcasts` | admin | Abunəçilərə xəbər: `{ channel: email/whatsapp, subject, body, userIds? }` |

Xətalarda `code` sahəsi də var (məs. `EMAIL_TAKEN`, `TEAM_NAME_TAKEN`) — sayt mesajı istifadəçinin dilində göstərir.

Təhlükəsizlik: şifrələr bcrypt ilə saxlanır; giriş (15 dəqiqədə 10), qeydiyyat və promokod yoxlaması üçün sorğu limiti var;
yalnız `CORS_ORIGINS`-dəki saytlar API-yə brauzerdən müraciət edə bilər.

## Email göndərmək (könüllü)

Admin paneldəki "Xəbər göndər" email ilə işləsin deyə serverə SMTP ayarları lazımdır (Render → dirdir-api → Environment):
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. Gmail: hesabda 2 addımlı doğrulamanı aç,
myaccount.google.com/apppasswords-dan "App password" yarat — `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`.
Ayarlar yoxdursa email kanalı söndürülür; WhatsApp kanalı həmişə işləyir (hər alıcı üçün hazır mesajlı link).

## Canlıya çıxarmaq (Render + Neon)

Kök qovluqdakı [`render.yaml`](../render.yaml) serverin bütün parametrlərini təsvir edir.

1. **Baza:** [neon.tech](https://neon.tech)-də pulsuz layihə yarat (region: Frankfurt). *Connection string*-i
   **connection pooling söndürülmüş** halda kopyala (`postgresql://...?sslmode=require`).
2. **Server:** [render.com](https://render.com) → *New → Blueprint* → bu repo. Render 4 dəyər soruşacaq:
   `DATABASE_URL` (Neon ünvanı), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PHONE`. `JWT_SECRET` avtomatik yaradılır.
   Server hər başlayanda admin hesabını yoxlayır: yoxdursa yaradır, varsa şifrəsinə toxunmur.
3. **Yoxla:** `https://<render-ünvanı>/api/health` → `{"ok":true}`.
4. **Frontend:** sayt Vercel-dədir; backend ünvanı kök qovluqdakı `.env.production` faylındadır
   (`VITE_API_URL=https://dirdir-api.onrender.com`). Saytın yeni ünvanı (məs. öz domen) `render.yaml`-dakı
   `CORS_ORIGINS`-ə əlavə olunmalıdır.

Qeyd: Render-in pulsuz planında server 15 dəqiqə sorğu gəlməyəndə yatır; sonrakı ilk sorğu ~30–60 saniyə gecikə bilər.

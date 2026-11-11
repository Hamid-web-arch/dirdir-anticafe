import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import sharp from 'sharp'
import { startTestServer } from './setup.js'

let ctx
let api

const aysel = {
  firstName: 'Aysel',
  lastName: 'Məmmədova',
  email: 'Aysel@Mail.com',
  phone: '+994 50 123 45 67',
  password: 'dirdir2026',
}

let mailbox // src/mail.js → testMailbox: testlərdə məktublar bura düşür

// Emailə gələn sonuncu 6 rəqəmli kod
const codeFor = (to) => [...mailbox].reverse().find((m) => m.to === to)?.text.match(/\b\d{6}\b/)?.[0]

// Qeydiyyat iki addımdır (forma → emailə kod → təsdiq). Bu köməkçi ikisini də edir və təsdiqin cavabını
// qaytarır ({ token, user }); forma xətalıdırsa — ilk addımın cavabını.
const register = async (overrides = {}) => {
  const res = await api.post('/api/auth/register').send({ ...aysel, ...overrides })
  if (res.status !== 202) return res
  return api.post('/api/auth/register/verify').send({ email: res.body.email, code: codeFor(res.body.email) })
}
const bearer = (token) => ({ Authorization: `Bearer ${token}` })

// Testlər üçün kiçik real şəkil (PNG)
const pngImage = (width = 2400, height = 1200) =>
  sharp({ create: { width, height, channels: 3, background: { r: 241, g: 102, b: 35 } } })
    .png()
    .toBuffer()

async function createAdmin() {
  await ctx.prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'DırDır',
      email: 'admin@dirdir.az',
      phone: '559999999',
      role: 'ADMIN',
      isSuperAdmin: true, // baş admin — bütün bölmələr
      passwordHash: await ctx.hashPassword('admin-password'),
    },
  })
  const res = await api.post('/api/auth/login').send({ email: 'admin@dirdir.az', password: 'admin-password' })
  return res.body.token
}

async function registerMany(n) {
  const users = []
  for (let i = 0; i < n; i++) {
    const res = await register({ email: `user${i}@mail.com`, phone: `50${String(1000000 + i)}`, firstName: `User${i}` })
    users.push(res.body)
  }
  return users
}

before(async () => {
  ctx = await startTestServer()
  api = request(ctx.app)
  mailbox = (await import('../src/mail.js')).testMailbox
})
after(() => ctx.stop())
beforeEach(() => {
  mailbox.length = 0
  return ctx.reset()
})

describe('ümumi', () => {
  it('health bazaya çatır', async () => {
    const res = await api.get('/api/health')
    assert.equal(res.status, 200)
    assert.deepEqual(res.body, { ok: true })
  })

  it('naməlum ünvan 404 və kod qaytarır', async () => {
    const res = await api.get('/api/yoxdur')
    assert.equal(res.status, 404)
    assert.equal(res.body.error.code, 'NOT_FOUND')
  })

  it('pozuq JSON 400 qaytarır', async () => {
    const res = await api.post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":')
    assert.equal(res.status, 400)
  })
})

describe('qeydiyyat', () => {
  it('hesab yaradır, email və telefonu normallaşdırır, hash qaytarmır', async () => {
    const res = await register()
    assert.equal(res.status, 201)
    assert.ok(res.body.token)
    assert.equal(res.body.user.email, 'aysel@mail.com')
    assert.equal(res.body.user.phone, '501234567')
    assert.equal(res.body.user.role, 'USER')
    assert.equal(res.body.user.avatarUrl, null)
    assert.equal(res.body.user.passwordHash, undefined)
  })

  it('yanlış sahələri ayrı-ayrı göstərir', async () => {
    const res = await register({ firstName: ' ', email: 'yanlis', phone: '12 345', password: '123' })
    assert.equal(res.status, 400)
    assert.deepEqual(Object.keys(res.body.error.fields).sort(), ['email', 'firstName', 'password', 'phone'])
  })

  it('təkrar email və telefonu kodla bildirir', async () => {
    await register()
    const sameEmail = await register({ email: 'AYSEL@mail.com', phone: '551112233' })
    assert.equal(sameEmail.status, 409)
    assert.deepEqual(sameEmail.body.error.fieldCodes, { email: 'EMAIL_TAKEN' })

    const samePhone = await register({ email: 'basqa@mail.com', phone: '050 123 45 67' })
    assert.deepEqual(samePhone.body.error.fieldCodes, { phone: 'PHONE_TAKEN' })
  })
})

describe('giriş', () => {
  beforeEach(() => register())

  it('email böyük/kiçik hərfdən asılı deyil', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'AYSEL@MAIL.COM', password: aysel.password })
    assert.equal(res.status, 200)
  })

  it('telefon nömrəsi ilə də daxil olmaq olur (istənilən yazılışda)', async () => {
    for (const login of ['+994 50 123 45 67', '050-123-45-67', '501234567', ' aysel@mail.com ']) {
      const res = await api.post('/api/auth/login').send({ login, password: aysel.password })
      assert.equal(res.status, 200, login)
      assert.equal(res.body.user.email, 'aysel@mail.com')
    }
    const wrong = await api.post('/api/auth/login').send({ login: '050 999 99 99', password: aysel.password })
    assert.equal(wrong.body.error.code, 'INVALID_CREDENTIALS')
    const junk = await api.post('/api/auth/login').send({ login: 'abc', password: aysel.password })
    assert.equal(junk.body.error.code, 'INVALID_CREDENTIALS')
    const empty = await api.post('/api/auth/login').send({ login: '  ', password: 'x' })
    assert.equal(empty.status, 400)
    assert.ok(empty.body.error.fields.login)
  })

  it('yanlış şifrə və naməlum email eyni cavabı alır', async () => {
    const wrongPass = await api.post('/api/auth/login').send({ email: aysel.email, password: 'yanlis-sifre' })
    const unknown = await api.post('/api/auth/login').send({ email: 'yox@mail.com', password: 'yanlis-sifre' })
    assert.equal(wrongPass.status, 401)
    assert.deepEqual(wrongPass.body, unknown.body)
    assert.equal(wrongPass.body.error.code, 'INVALID_CREDENTIALS')
  })

  it('/me tokensiz, pozuq və silinmiş hesabın tokeni ilə 401', async () => {
    assert.equal((await api.get('/api/auth/me')).body.error.code, 'AUTH_REQUIRED')
    assert.equal((await api.get('/api/auth/me').set(bearer('pozuq.token'))).body.error.code, 'SESSION_EXPIRED')

    const { body } = await api.post('/api/auth/login').send({ email: aysel.email, password: aysel.password })
    assert.equal((await api.get('/api/auth/me').set(bearer(body.token))).status, 200)
    await ctx.prisma.user.deleteMany()
    assert.equal((await api.get('/api/auth/me').set(bearer(body.token))).status, 401)
  })
})

describe('profil', () => {
  let token
  beforeEach(async () => {
    token = (await register()).body.token
  })

  it('ad, soyad və telefonu dəyişir; başqasının nömrəsini götürə bilmir', async () => {
    const res = await api.patch('/api/auth/me').set(bearer(token)).send({ firstName: 'Ayselə', phone: '0551112233' })
    assert.equal(res.status, 200)
    assert.equal(res.body.user.firstName, 'Ayselə')
    assert.equal(res.body.user.phone, '551112233')

    await register({ email: 'b@mail.com', phone: '701112233' })
    const taken = await api.patch('/api/auth/me').set(bearer(token)).send({ phone: '701112233' })
    assert.equal(taken.status, 409)
    assert.deepEqual(taken.body.error.fieldCodes, { phone: 'PHONE_TAKEN' })

    // Öz nömrəsini yenidən göndərmək xəta deyil
    assert.equal((await api.patch('/api/auth/me').set(bearer(token)).send({ phone: '551112233' })).status, 200)
  })

  it('email və rol profil yeniləməsi ilə dəyişmir', async () => {
    const res = await api.patch('/api/auth/me').set(bearer(token)).send({ firstName: 'X', role: 'ADMIN', email: 'h@x.az' })
    assert.equal(res.body.user.role, 'USER')
    assert.equal(res.body.user.email, 'aysel@mail.com')
  })

  it('şifrəni dəyişir: köhnə şifrə yanlışdırsa xəta, sonra yeni şifrə ilə giriş', async () => {
    const wrong = await api.post('/api/auth/me/password').set(bearer(token)).send({ currentPassword: 'yox', newPassword: 'yeni-sifre-1' })
    assert.equal(wrong.status, 400)
    assert.deepEqual(wrong.body.error.fieldCodes, { currentPassword: 'WRONG_PASSWORD' })

    // Başqa cihazdakı sessiya: şifrə dəyişməzdən əvvəl daxil olub
    await new Promise((r) => setTimeout(r, 1100)) // tokenlərin "iat" vaxtı saniyə ilədir
    const ok = await api.post('/api/auth/me/password').set(bearer(token)).send({ currentPassword: aysel.password, newPassword: 'yeni-sifre-1' })
    assert.equal(ok.status, 200)
    assert.ok(ok.body.token)
    assert.equal((await api.post('/api/auth/login').send({ email: aysel.email, password: aysel.password })).status, 401)
    assert.equal((await api.post('/api/auth/login').send({ email: aysel.email, password: 'yeni-sifre-1' })).status, 200)

    // Köhnə token (o cümlədən başqa cihazlardakı) artıq işləmir, yeni token işləyir
    const old = await api.get('/api/auth/me').set(bearer(token))
    assert.equal(old.status, 401)
    assert.equal(old.body.error.code, 'SESSION_EXPIRED')
    assert.equal((await api.get('/api/auth/me').set(bearer(ok.body.token))).status, 200)
  })

  it('saxta tokenlər: "alg: none" və başqa açarla imzalanmış token qəbul olunmur', async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
    const user = await ctx.prisma.user.findFirst()
    const none = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: user.id, role: 'ADMIN', iat: Math.floor(Date.now() / 1000) })}.`
    assert.equal((await api.get('/api/auth/me').set(bearer(none))).status, 401)
    const jwt = (await import('jsonwebtoken')).default
    const forged = jwt.sign({ sub: user.id, role: 'ADMIN' }, 'başqa-açar-başqa-açar-başqa-açar-123456')
    assert.equal((await api.get('/api/admin/users').set(bearer(forged))).status, 401)
  })

  it('SVG və başqa qeyri-foto fayllar rədd olunur', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')
    const res = await api.put('/api/auth/me/avatar').set(bearer(token)).set('Content-Type', 'image/svg+xml').send(svg)
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'IMAGE_INVALID')
  })

  it('profil şəkli: 256×256 WebP-yə çevrilir, əvəz olunanda köhnəsi silinir, silinə bilir', async () => {
    const first = await api.put('/api/auth/me/avatar').set(bearer(token)).set('Content-Type', 'image/png').send(await pngImage())
    assert.equal(first.status, 200)
    const url = first.body.user.avatarUrl
    assert.match(url, /^\/api\/images\//)

    const img = await api.get(url).buffer(true)
    assert.equal(img.status, 200)
    assert.equal(img.headers['content-type'], 'image/webp')
    assert.equal(img.headers['cross-origin-resource-policy'], 'cross-origin')
    const meta = await sharp(img.body).metadata()
    assert.deepEqual([meta.width, meta.height], [256, 256])

    const second = await api.put('/api/auth/me/avatar').set(bearer(token)).set('Content-Type', 'image/png').send(await pngImage(300, 300))
    assert.notEqual(second.body.user.avatarUrl, url)
    assert.equal((await api.get(url)).status, 404)
    assert.equal(await ctx.prisma.image.count(), 1)

    const removed = await api.delete('/api/auth/me/avatar').set(bearer(token))
    assert.equal(removed.body.user.avatarUrl, null)
    assert.equal(await ctx.prisma.image.count(), 0)
  })

  it('şəkil olmayan faylı qəbul etmir', async () => {
    const res = await api.put('/api/auth/me/avatar').set(bearer(token)).set('Content-Type', 'image/png').send(Buffer.from('salam'))
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'IMAGE_INVALID')
  })
})

describe('admin icazələri', () => {
  it('adi istifadəçi admin ünvanlarına girə bilmir', async () => {
    const { body } = await register()
    assert.equal((await api.get('/api/admin/users').set(bearer(body.token))).status, 403)
    assert.equal((await api.get('/api/admin/promo-codes')).status, 401)
    assert.equal((await api.post('/api/admin/slides').set(bearer(body.token)).send({})).status, 403)
  })
})

describe('yarışlar', () => {
  let adminToken
  let users

  const createCompetition = (body = {}) =>
    api
      .post('/api/admin/competitions')
      .set(bearer(adminToken))
      .send({ title: { az: 'UNO turniri', en: 'UNO tournament' }, startsAt: '2026-11-01T18:00:00Z', ...body })
  const join = (id, token, teamName) => api.post(`/api/competitions/${id}/join`).set(bearer(token)).send({ teamName })
  const award = (teamId, amount, reason = 'Tur') =>
    api.post(`/api/admin/teams/${teamId}/points`).set(bearer(adminToken)).send({ amount, reason })

  beforeEach(async () => {
    adminToken = await createAdmin()
    users = await registerMany(4)
  })

  it('admin yarış yaradır; boş dillər boş sətir olur', async () => {
    const res = await createCompetition()
    assert.equal(res.status, 201)
    assert.deepEqual(res.body.competition.title, { az: 'UNO turniri', en: 'UNO tournament', ru: '' })
    assert.equal(res.body.competition.status, 'UPCOMING')
    assert.equal((await createCompetition({ title: { az: '' } })).status, 400)
  })

  it('hədiyyələr: yerə görə sıralanır, təkrar yer rədd olunur, saytda görünür', async () => {
    const created = await createCompetition({
      prizes: [
        { place: 2, title: { az: '2 saat pulsuz' } },
        { place: 1, title: { az: 'Kino otağı 1 gecə', en: 'Cinema room for a night' } },
      ],
    })
    assert.equal(created.status, 201)
    assert.deepEqual(
      created.body.competition.prizes.map((p) => [p.place, p.title.az, p.title.en]),
      [[1, 'Kino otağı 1 gecə', 'Cinema room for a night'], [2, '2 saat pulsuz', '']],
    )
    const id = created.body.competition.id
    assert.equal((await api.get(`/api/competitions/${id}`)).body.competition.prizes.length, 2)
    assert.equal((await api.get('/api/competitions')).body.competitions[0].prizes[0].place, 1)

    const dup = await api
      .patch(`/api/admin/competitions/${id}`)
      .set(bearer(adminToken))
      .send({ prizes: [{ place: 1, title: { az: 'A' } }, { place: 1, title: { az: 'B' } }] })
    assert.equal(dup.status, 400)
    const empty = await api
      .patch(`/api/admin/competitions/${id}`)
      .set(bearer(adminToken))
      .send({ prizes: [{ place: 1, title: { az: '' } }] })
    assert.ok(empty.body.error.fields['prizes.0.title.az'])

    const cleared = await api.patch(`/api/admin/competitions/${id}`).set(bearer(adminToken)).send({ prizes: [] })
    assert.deepEqual(cleared.body.competition.prizes, [])
  })

  it('qoşulmaq üçün hesab lazımdır; komanda adı soruşulur', async () => {
    const c = (await createCompetition()).body.competition
    assert.equal((await api.post(`/api/competitions/${c.id}/join`).send({ teamName: 'Zarlar' })).status, 401)
    assert.equal((await join(c.id, users[0].token, ' ')).status, 400)

    const res = await join(c.id, users[0].token, '  Zar   Ustaları ')
    assert.equal(res.status, 201)
    assert.equal(res.body.team.name, 'Zar Ustaları')
  })

  it('bir istifadəçi bir dəfə qoşulur; komanda adı yarış daxilində unikal', async () => {
    const c = (await createCompetition()).body.competition
    await join(c.id, users[0].token, 'Zarlar')
    assert.equal((await join(c.id, users[0].token, 'Başqa')).body.error.code, 'ALREADY_JOINED')

    const dup = await join(c.id, users[1].token, 'ZARLAR')
    assert.equal(dup.status, 409)
    assert.deepEqual(dup.body.error.fieldCodes, { teamName: 'TEAM_NAME_TAKEN' })

    // Başqa yarışda eyni ad olar
    const other = (await createCompetition()).body.competition
    assert.equal((await join(other.id, users[1].token, 'Zarlar')).status, 201)
  })

  it('qeydiyyat bağlı, bitmiş və dolu yarışa qoşulmaq olmur', async () => {
    const closed = (await createCompetition({ registrationOpen: false })).body.competition
    assert.equal((await join(closed.id, users[0].token, 'A')).status, 400)
    assert.equal((await join(closed.id, users[0].token, 'AA')).body.error.code, 'REGISTRATION_CLOSED')

    const finished = (await createCompetition({ status: 'FINISHED' })).body.competition
    assert.equal((await join(finished.id, users[0].token, 'AA')).body.error.code, 'REGISTRATION_CLOSED')

    const small = (await createCompetition({ maxTeams: 2 })).body.competition
    await join(small.id, users[0].token, 'Bir')
    await join(small.id, users[1].token, 'İki')
    assert.equal((await join(small.id, users[2].token, 'Üç')).body.error.code, 'COMPETITION_FULL')
    const view = await api.get(`/api/competitions/${small.id}`)
    assert.equal(view.body.competition.isFull, true)
    assert.equal(view.body.competition.canJoin, false)
  })

  it('eyni anda gələn qoşulmalar yer sayını aşmır', async () => {
    const c = (await createCompetition({ maxTeams: 2 })).body.competition
    const results = await Promise.all(users.map((u, i) => join(c.id, u.token, `Komanda ${i}`)))
    assert.equal(results.filter((r) => r.status === 201).length, 2)
    assert.equal(await ctx.prisma.team.count(), 2)
  })

  it('başlamamış yarışdan çıxmaq olur, başlamışdan yox', async () => {
    const c = (await createCompetition()).body.competition
    await join(c.id, users[0].token, 'Zarlar')
    assert.equal((await api.delete(`/api/competitions/${c.id}/join`).set(bearer(users[0].token))).status, 204)

    await join(c.id, users[0].token, 'Zarlar')
    await api.patch(`/api/admin/competitions/${c.id}`).set(bearer(adminToken)).send({ status: 'ONGOING' })
    const res = await api.delete(`/api/competitions/${c.id}/join`).set(bearer(users[0].token))
    assert.equal(res.body.error.code, 'CANNOT_LEAVE')
  })

  it('lövhə: xala görə, bərabərdə əvvəl qoşulan; şəxsi məlumat görünmür; "mənim komandam"', async () => {
    const c = (await createCompetition()).body.competition
    const teams = []
    for (const [i, name] of ['Zarlar', 'Kofe Kralları', 'Jenga'].entries()) {
      teams.push((await join(c.id, users[i].token, name)).body.team)
    }
    await award(teams[0].id, 30)
    await award(teams[1].id, 80)
    await award(teams[2].id, 30)

    const res = await api.get(`/api/competitions/${c.id}`).set(bearer(users[2].token))
    assert.deepEqual(
      res.body.leaderboard.map((t) => [t.rank, t.name, t.points]),
      [
        [1, 'Kofe Kralları', 80],
        [2, 'Zarlar', 30],
        [3, 'Jenga', 30],
      ],
    )
    assert.equal(res.body.leaderboard[0].userId, undefined)
    assert.equal(res.body.competition.myTeam.name, 'Jenga')
    assert.equal((await api.get(`/api/competitions/${c.id}`)).body.competition.myTeam, null)
  })

  it('xal 0-dan aşağı düşmür, eyni anda gələn xallar itmir, tarixçə yazılır', async () => {
    const c = (await createCompetition()).body.competition
    const team = (await join(c.id, users[0].token, 'Zarlar')).body.team
    await award(team.id, 10)
    assert.equal((await award(team.id, -11)).body.error.code, 'NEGATIVE_POINTS')

    await Promise.all(Array.from({ length: 8 }, () => award(team.id, 5)))
    const view = await api.get(`/api/competitions/${c.id}`)
    assert.equal(view.body.leaderboard[0].points, 50)

    const history = await api.get(`/api/admin/teams/${team.id}/points`).set(bearer(adminToken))
    assert.equal(history.body.entries.length, 9)
    assert.equal(history.body.entries[0].createdBy.firstName, 'Admin')
  })

  it('profildə yarış tarixçəsi: komanda, xal, yer', async () => {
    const c = (await createCompetition()).body.competition
    const mine = (await join(c.id, users[0].token, 'Zarlar')).body.team
    const rival = (await join(c.id, users[1].token, 'Rəqib')).body.team
    await award(rival.id, 20)
    await award(mine.id, 5)

    const res = await api.get('/api/auth/me/teams').set(bearer(users[0].token))
    assert.equal(res.body.teams.length, 1)
    assert.equal(res.body.teams[0].name, 'Zarlar')
    assert.equal(res.body.teams[0].rank, 2)
    assert.equal(res.body.teams[0].competition.title.az, 'UNO turniri')
  })

  it('siyahı: gedən → gələcək → bitmiş; admin komandaları əlaqə məlumatı ilə görür; silmək', async () => {
    const done = (await createCompetition({ title: { az: 'Bitmiş' }, status: 'FINISHED' })).body.competition
    const later = (await createCompetition({ title: { az: 'Gələcək' }, startsAt: '2027-01-01T00:00:00Z' })).body.competition
    const now = (await createCompetition({ title: { az: 'Gedən' }, status: 'ONGOING' })).body.competition

    const list = await api.get('/api/competitions')
    assert.deepEqual(list.body.competitions.map((c) => c.title.az), ['Gedən', 'Gələcək', 'Bitmiş'])

    await join(later.id, users[0].token, 'Zarlar')
    const teams = await api.get(`/api/admin/competitions/${later.id}/teams`).set(bearer(adminToken))
    assert.equal(teams.body.teams[0].user.email, 'user0@mail.com')

    assert.equal((await api.delete(`/api/admin/competitions/${later.id}`).set(bearer(adminToken))).status, 204)
    assert.equal(await ctx.prisma.team.count(), 0)
    assert.ok(done && now)
  })
})

describe('slider', () => {
  let adminToken
  beforeEach(async () => {
    adminToken = await createAdmin()
  })

  const upload = async (w, h) =>
    (await api.post('/api/admin/images').set(bearer(adminToken)).set('Content-Type', 'image/png').send(await pngImage(w, h))).body.image
  const createSlide = async (title, extra = {}) => {
    const image = await upload() // sorğunu şəkil yükləndikdən sonra qururuq
    return api.post('/api/admin/slides').set(bearer(adminToken)).send({ imageId: image.id, title: { az: title }, ...extra })
  }

  it('şəkil eni 1600-ə kiçildilir', async () => {
    const image = await upload(3200, 1800)
    assert.deepEqual([image.width, image.height], [1600, 900])
  })

  it('yaradır, sıra ilə qaytarır, deaktivi saytda göstərmir', async () => {
    await createSlide('Bir')
    await createSlide('İki', { active: false, link: '/arena' })
    await createSlide('Üç', { fit: 'contain' })

    const pub = await api.get('/api/slides')
    assert.deepEqual(pub.body.slides.map((s) => s.title.az), ['Bir', 'Üç'])
    assert.equal(pub.body.slides[1].fit, 'contain')

    const all = await api.get('/api/admin/slides').set(bearer(adminToken))
    assert.deepEqual(all.body.slides.map((s) => [s.title.az, s.position]), [['Bir', 0], ['İki', 1], ['Üç', 2]])
  })

  it('link yoxlanır: "/" və ya https', async () => {
    assert.equal((await createSlide('X', { link: 'javascript:alert(1)' })).status, 400)
    assert.equal((await createSlide('X', { link: 'http://insecure.az' })).status, 400)
    // Saytın öz yolu kimi görünən, amma başqa sayta aparan linklər
    assert.equal((await createSlide('X', { link: '//evil.example' })).status, 400)
    assert.equal((await createSlide('X', { link: '/\\evil.example' })).status, 400)
    assert.equal((await createSlide('X', { link: '/arena' })).status, 201)
    assert.equal((await createSlide('X', { link: 'https://instagram.com/dirdiranticafe' })).status, 201)
  })

  it('şəkli əvəz edəndə köhnə şəkil silinir; eyni şəkil iki slayda bağlanmır', async () => {
    const slide = (await createSlide('Bir')).body.slide
    const oldUrl = slide.imageUrl
    const fresh = await upload()
    const res = await api.patch(`/api/admin/slides/${slide.id}`).set(bearer(adminToken)).send({ imageId: fresh.id, title: { az: 'Yeni' } })
    assert.equal(res.status, 200)
    assert.equal(res.body.slide.title.az, 'Yeni')
    assert.equal((await api.get(oldUrl)).status, 404)

    const reuse = await api.post('/api/admin/slides').set(bearer(adminToken)).send({ imageId: fresh.id, title: { az: 'Kopya' } })
    assert.equal(reuse.status, 400)
  })

  it('sıranı dəyişir; natamam siyahını qəbul etmir; silmək şəkli də silir', async () => {
    const a = (await createSlide('A')).body.slide
    const b = (await createSlide('B')).body.slide
    const c = (await createSlide('C')).body.slide

    const reordered = await api.put('/api/admin/slides/order').set(bearer(adminToken)).send({ ids: [c.id, a.id, b.id] })
    assert.deepEqual(reordered.body.slides.map((s) => s.title.az), ['C', 'A', 'B'])
    assert.equal((await api.put('/api/admin/slides/order').set(bearer(adminToken)).send({ ids: [a.id, b.id] })).status, 400)

    assert.equal((await api.delete(`/api/admin/slides/${a.id}`).set(bearer(adminToken))).status, 204)
    assert.equal(await ctx.prisma.image.count(), 2)
    assert.deepEqual((await api.get('/api/slides')).body.slides.map((s) => s.title.az), ['C', 'B'])
  })
})

describe('promokodlar', () => {
  let adminToken
  beforeEach(async () => {
    adminToken = await createAdmin()
  })

  const create = (body) => api.post('/api/admin/promo-codes').set(bearer(adminToken)).send(body)
  const validate = (code) => api.post('/api/promo/validate').send({ code })

  it('admin kod yaradır, böyük hərflə saxlanır və yoxlanır', async () => {
    assert.equal((await create({ code: 'yay2026', percent: 15 })).body.promoCode.code, 'YAY2026')
    assert.deepEqual((await validate(' Yay2026 ')).body, { code: 'YAY2026', percent: 15 })
  })

  it('təkrar kod 409, yanlış faiz 400; deaktiv və vaxtı keçmiş tapılmır', async () => {
    await create({ code: 'YAY2026', percent: 15 })
    assert.equal((await create({ code: 'yay2026', percent: 10 })).status, 409)
    assert.equal((await create({ code: 'BOYUK', percent: 150 })).status, 400)

    const off = await create({ code: 'SONDU', percent: 10 })
    await api.patch(`/api/admin/promo-codes/${off.body.promoCode.id}`).set(bearer(adminToken)).send({ active: false })
    await create({ code: 'KECDI', percent: 10, expiresAt: '2020-01-01T00:00:00Z' })
    assert.equal((await validate('SONDU')).body.error.code, 'PROMO_NOT_FOUND')
    assert.equal((await validate('KECDI')).status, 404)
    assert.equal((await validate('YOXDUR')).status, 404)
  })
})

describe('admin istifadəçi axtarışı', () => {
  it('ad, email və telefona görə tapır', async () => {
    const adminToken = await createAdmin()
    await register()
    const byName = await api.get('/api/admin/users?q=ays').set(bearer(adminToken))
    assert.equal(byName.body.users.length, 1)
    assert.equal(byName.body.total, 1)
    const byPhone = await api.get('/api/admin/users?q=050 123').set(bearer(adminToken))
    assert.equal(byPhone.body.users.length, 1)
    assert.equal(byPhone.body.users[0].passwordHash, undefined)
  })
})

describe('admin: istifadəçiləri idarə etmək', () => {
  let adminToken
  let users

  beforeEach(async () => {
    adminToken = await createAdmin()
    users = await registerMany(3)
  })

  const list = (query = '') => api.get(`/api/admin/users${query}`).set(bearer(adminToken))
  const newCompetition = (az) =>
    api.post('/api/admin/competitions').set(bearer(adminToken)).send({ title: { az }, startsAt: '2026-11-01T18:00:00Z' })

  it('bir neçə sözlə axtarır; rol, status, yarış filtrləri və sıralama', async () => {
    assert.equal((await list('?q=user1 mail.com')).body.total, 1)
    assert.equal((await list('?role=ADMIN')).body.users[0].email, 'admin@dirdir.az')
    assert.equal((await list('?role=USER')).body.total, 3)
    assert.deepEqual(
      (await list('?sort=old&role=USER')).body.users.map((u) => u.firstName),
      ['User0', 'User1', 'User2'],
    )
    const page = await list('?role=USER&limit=2&offset=2')
    assert.equal(page.body.users.length, 1)
    assert.equal(page.body.total, 3)

    const comp = await newCompetition('Mafia')
    await api.post(`/api/competitions/${comp.body.competition.id}/join`).set(bearer(users[1].token)).send({ teamName: 'Qartallar' })
    const joined = await list('?joined=yes')
    assert.deepEqual(joined.body.users.map((u) => u.firstName), ['User1'])
    assert.equal(joined.body.users[0].teamCount, 1)
    assert.equal((await list(`?competitionId=${comp.body.competition.id}`)).body.total, 1)
    assert.equal((await list('?joined=no&role=USER')).body.total, 2)

    const detail = await api.get(`/api/admin/users/${users[1].user.id}`).set(bearer(adminToken))
    assert.equal(detail.body.teams[0].name, 'Qartallar')
    assert.equal(detail.body.teams[0].competition.title.az, 'Mafia')
  })

  it('bloklanan istifadəçi daxil ola bilmir, köhnə tokeni işləmir; blok açılır', async () => {
    const target = users[0]
    const blocked = await api.patch(`/api/admin/users/${target.user.id}`).set(bearer(adminToken)).send({ blocked: true })
    assert.equal(blocked.status, 200)
    assert.equal(blocked.body.user.blocked, true)
    assert.ok(blocked.body.user.blockedAt)

    const me = await api.get('/api/auth/me').set(bearer(target.token))
    assert.equal(me.status, 401)
    assert.equal(me.body.error.code, 'ACCOUNT_BLOCKED')

    const login = await api.post('/api/auth/login').send({ email: 'user0@mail.com', password: aysel.password })
    assert.equal(login.status, 403)
    assert.equal(login.body.error.code, 'ACCOUNT_BLOCKED')
    // Yanlış şifrədə blok barədə heç nə demirik
    const wrong = await api.post('/api/auth/login').send({ email: 'user0@mail.com', password: 'yanlis-sifre' })
    assert.equal(wrong.body.error.code, 'INVALID_CREDENTIALS')

    assert.equal((await list('?status=blocked')).body.total, 1)
    assert.equal((await list('?status=active&role=USER')).body.total, 2)

    await api.patch(`/api/admin/users/${target.user.id}`).set(bearer(adminToken)).send({ blocked: false })
    assert.equal((await api.post('/api/auth/login').send({ email: 'user0@mail.com', password: aysel.password })).status, 200)
  })

  it('silmək: komandaları və profil şəkli də silinir; admini bloklamaq/silmək olmur', async () => {
    const target = users[2]
    const avatar = await pngImage(300, 300)
    await api.put('/api/auth/me/avatar').set(bearer(target.token)).set('Content-Type', 'image/png').send(avatar)
    const comp = await newCompetition('UNO')
    await api.post(`/api/competitions/${comp.body.competition.id}/join`).set(bearer(target.token)).send({ teamName: 'Şirlər' })

    const del = await api.delete(`/api/admin/users/${target.user.id}`).set(bearer(adminToken))
    assert.equal(del.status, 204)
    assert.equal(await ctx.prisma.user.count({ where: { id: target.user.id } }), 0)
    assert.equal(await ctx.prisma.team.count(), 0)
    assert.equal(await ctx.prisma.image.count(), 0)
    assert.equal((await api.get('/api/auth/me').set(bearer(target.token))).status, 401)

    const admin = await ctx.prisma.user.findUnique({ where: { email: 'admin@dirdir.az' } })
    const blockAdmin = await api.patch(`/api/admin/users/${admin.id}`).set(bearer(adminToken)).send({ blocked: true })
    assert.equal(blockAdmin.body.error.code, 'CANNOT_MODIFY_SELF')
    assert.equal((await api.delete(`/api/admin/users/${admin.id}`).set(bearer(adminToken))).status, 400)
    assert.equal((await api.delete('/api/admin/users/yoxdur').set(bearer(adminToken))).status, 404)
  })

  it('İstifadəçilər bölməsindən yalnız adi hesab açılır (rol göndərilsə də); təkrar email/telefon rədd olunur', async () => {
    const created = await api.post('/api/admin/users').set(bearer(adminToken)).send({
      firstName: 'Nərmin',
      lastName: 'Əliyeva',
      email: 'Narmin@Dirdir.az',
      phone: '070 555 44 33',
      password: 'isci-sifre-2026',
      role: 'ADMIN',
    })
    assert.equal(created.status, 201)
    assert.equal(created.body.user.role, 'USER')
    assert.equal(created.body.user.email, 'narmin@dirdir.az')
    assert.equal(created.body.user.passwordHash, undefined)

    const login = await api.post('/api/auth/login').send({ email: 'narmin@dirdir.az', password: 'isci-sifre-2026' })
    assert.equal((await api.get('/api/admin/users').set(bearer(login.body.token))).status, 403)

    const dup = await api.post('/api/admin/users').set(bearer(adminToken)).send({
      firstName: 'X',
      lastName: 'Y',
      email: 'narmin@dirdir.az',
      phone: '070 555 44 33',
      password: 'whatever-123',
    })
    assert.equal(dup.status, 409)
    assert.deepEqual(dup.body.error.fieldCodes, { email: 'EMAIL_TAKEN', phone: 'PHONE_TAKEN' })

    const bad = await api.post('/api/admin/users').set(bearer(adminToken)).send({ email: 'yox' })
    assert.equal(bad.status, 400)
    assert.ok(bad.body.error.fields.firstName && bad.body.error.fields.password)
  })

  it('İstifadəçilər bölməsindən admin hesabına toxunmaq olmur; rol dəyişmir', async () => {
    const target = users[0]
    const patch = (id, body) => api.patch(`/api/admin/users/${id}`).set(bearer(adminToken)).send(body)
    await ctx.prisma.user.update({ where: { id: target.user.id }, data: { role: 'ADMIN' } })

    assert.equal((await patch(target.user.id, { blocked: true })).body.error.code, 'CANNOT_MODIFY_ADMIN')
    assert.equal((await api.delete(`/api/admin/users/${target.user.id}`).set(bearer(adminToken))).body.error.code, 'CANNOT_MODIFY_ADMIN')
    // "role" sahəsi artıq qəbul olunmur — yalnız blok
    assert.equal((await patch(users[1].user.id, { role: 'ADMIN' })).status, 400)
    assert.equal((await patch(users[1].user.id, {})).status, 400)
  })
})

describe('adminlər və icazələr', () => {
  let superToken
  const newAdmin = (overrides = {}) => ({
    firstName: 'Leyla',
    lastName: 'Kərimova',
    email: 'leyla@dirdir.az',
    phone: '+994 55 444 33 22',
    password: 'leyla-2026-sifre',
    permissions: ['hesabat', 'qiymetler'],
    ...overrides,
  })
  const loginAs = async (email, password) => (await api.post('/api/auth/login').send({ email, password })).body.token

  beforeEach(async () => {
    superToken = await createAdmin()
  })

  it('baş admin admin yaradır; admin yalnız icazəli bölmələrə girir', async () => {
    const created = await api.post('/api/admin/admins').set(bearer(superToken)).send(newAdmin())
    assert.equal(created.status, 201)
    assert.equal(created.body.admin.role, 'ADMIN')
    assert.equal(created.body.admin.isSuperAdmin, false)
    assert.deepEqual(created.body.admin.permissions, ['hesabat', 'qiymetler'])

    const token = await loginAs('leyla@dirdir.az', 'leyla-2026-sifre')
    const me = await api.get('/api/auth/me').set(bearer(token))
    assert.deepEqual(me.body.user.permissions, ['hesabat', 'qiymetler'])

    // İcazəli bölmələr
    assert.equal((await api.get('/api/admin/visits').set(bearer(token))).status, 200)
    assert.equal((await api.get('/api/admin/pricing').set(bearer(token))).status, 200)
    // Günün hesabatında müştəri axtarışı üçün istifadəçi siyahısı açıqdır, amma idarəsi yox
    assert.equal((await api.get('/api/admin/users?q=a').set(bearer(token))).status, 200)
    assert.equal((await api.get(`/api/admin/users/${created.body.admin.id}`).set(bearer(token))).status, 403)
    // İcazəsiz bölmələr
    for (const path of ['/api/admin/slides', '/api/admin/promo-codes', '/api/admin/games', '/api/admin/feedback', '/api/admin/broadcasts', '/api/admin/site-images', '/api/admin/competitions']) {
      assert.equal((await api.get(path).set(bearer(token))).status, 403, path)
    }
    assert.equal((await api.put('/api/admin/slides/order').set(bearer(token)).send({ ids: [] })).status, 403)
    // Adminləri yalnız baş admin idarə edir
    assert.equal((await api.get('/api/admin/admins').set(bearer(token))).status, 403)
    assert.equal((await api.post('/api/admin/admins').set(bearer(token)).send(newAdmin({ email: 'x@x.az', phone: '501112233' }))).status, 403)

    // Baş admin hər yerə girir
    assert.equal((await api.get('/api/admin/slides').set(bearer(superToken))).status, 200)
    const list = await api.get('/api/admin/admins').set(bearer(superToken))
    assert.deepEqual(list.body.admins.map((a) => [a.email, a.isSuperAdmin]), [['admin@dirdir.az', true], ['leyla@dirdir.az', false]])
  })

  it('icazələri dəyişmək, bloklamaq, şifrəni yeniləmək; baş adminə toxunmaq olmur', async () => {
    const { body } = await api.post('/api/admin/admins').set(bearer(superToken)).send(newAdmin())
    const id = body.admin.id
    const token = await loginAs('leyla@dirdir.az', 'leyla-2026-sifre')

    const changed = await api.patch(`/api/admin/admins/${id}`).set(bearer(superToken)).send({ permissions: ['slider', 'slider'] })
    assert.deepEqual(changed.body.admin.permissions, ['slider'])
    // İcazə dərhal tətbiq olunur (hər sorğuda bazadan oxunur)
    assert.equal((await api.get('/api/admin/visits').set(bearer(token))).status, 403)
    assert.equal((await api.get('/api/admin/slides').set(bearer(token))).status, 200)

    const bad = await api.patch(`/api/admin/admins/${id}`).set(bearer(superToken)).send({ permissions: ['adminler'] })
    assert.equal(bad.status, 400)

    // Yeni şifrə — köhnə sessiya bağlanır
    await new Promise((r) => setTimeout(r, 1100)) // tokenlərin "iat" vaxtı saniyə ilədir
    await api.patch(`/api/admin/admins/${id}`).set(bearer(superToken)).send({ password: 'yeni-sifre-2026' })
    assert.equal((await api.get('/api/auth/me').set(bearer(token))).status, 401)
    const token2 = await loginAs('leyla@dirdir.az', 'yeni-sifre-2026')
    assert.ok(token2)

    // Blok
    await api.patch(`/api/admin/admins/${id}`).set(bearer(superToken)).send({ blocked: true })
    assert.equal((await api.get('/api/admin/slides').set(bearer(token2))).status, 401)
    const unblocked = await api.patch(`/api/admin/admins/${id}`).set(bearer(superToken)).send({ blocked: false })
    assert.equal(unblocked.body.admin.blocked, false)

    // Baş adminin özünə buradan toxunmaq olmur
    const superAdmin = await ctx.prisma.user.findUnique({ where: { email: 'admin@dirdir.az' } })
    const touchSuper = await api.patch(`/api/admin/admins/${superAdmin.id}`).set(bearer(superToken)).send({ blocked: true })
    assert.equal(touchSuper.body.error.code, 'CANNOT_MODIFY_SUPER_ADMIN')
    assert.equal((await api.post(`/api/admin/admins/${superAdmin.id}/demote`).set(bearer(superToken))).status, 400)
  })

  it('mövcud istifadəçini admin etmək, adminlikdən çıxarmaq və silmək', async () => {
    const user = (await register()).body
    const promoted = await api
      .post('/api/admin/admins/promote')
      .set(bearer(superToken))
      .send({ userId: user.user.id, permissions: ['reyler'] })
    assert.equal(promoted.body.admin.role, 'ADMIN')
    assert.equal((await api.get('/api/admin/feedback').set(bearer(user.token))).status, 200)
    assert.equal(
      (await api.post('/api/admin/admins/promote').set(bearer(superToken)).send({ userId: user.user.id })).body.error.code,
      'ALREADY_ADMIN',
    )

    const demoted = await api.post(`/api/admin/admins/${user.user.id}/demote`).set(bearer(superToken))
    assert.equal(demoted.body.user.role, 'USER')
    assert.deepEqual(demoted.body.user.permissions, [])
    assert.equal((await api.get('/api/admin/feedback').set(bearer(user.token))).status, 403)

    // Yenidən admin edib silmək
    await api.post('/api/admin/admins/promote').set(bearer(superToken)).send({ userId: user.user.id })
    assert.equal((await api.delete(`/api/admin/admins/${user.user.id}`).set(bearer(superToken))).status, 204)
    assert.equal(await ctx.prisma.user.count({ where: { id: user.user.id } }), 0)
  })
})

describe('qiymətlər', () => {
  it('standart qiymətlər; admin dəyişir; yanlış dəyərlər sahə ilə rədd olunur', async () => {
    const initial = await api.get('/api/pricing')
    assert.equal(initial.status, 200)
    assert.equal(initial.body.pricing.hall.firstHour, 4)

    const adminToken = await createAdmin()
    const pricing = structuredClone(initial.body.pricing)
    pricing.hall.firstHour = 5
    pricing.hall.cap = 14.5
    const saved = await api.put('/api/admin/pricing').set(bearer(adminToken)).send(pricing)
    assert.equal(saved.status, 200)
    assert.equal((await api.get('/api/pricing')).body.pricing.hall.cap, 14.5)

    const bad = structuredClone(pricing)
    bad.hall.cap = 2 // ilk saatdan az
    bad.room.smallGroup.maxPeople = 9 // otaqdan çox
    bad.hall.nextHour = 3.333
    const res = await api.put('/api/admin/pricing').set(bearer(adminToken)).send(bad)
    assert.equal(res.status, 400)
    assert.ok(res.body.error.fields['hall.nextHour'])
    // Səhv sorğu saxlanmayıb
    assert.equal((await api.get('/api/pricing')).body.pricing.hall.firstHour, 5)

    const bad2 = structuredClone(pricing)
    bad2.hall.cap = 2
    bad2.room.smallGroup.maxPeople = 9
    const res2 = await api.put('/api/admin/pricing').set(bearer(adminToken)).send(bad2)
    assert.ok(res2.body.error.fields['hall.cap'])
    assert.ok(res2.body.error.fields['room.smallGroup.maxPeople'])

    const { body } = await register()
    assert.equal((await api.put('/api/admin/pricing').set(bearer(body.token)).send(pricing)).status, 403)
  })
})

describe('lövhə dövrləri', () => {
  it('həftə bazar ertəsi, ay 1-i Bakı vaxtı ilə başlayır', async () => {
    const { periodStart } = await import('../src/routes/competitions.js')
    // Çərşənbə, 8 oktyabr 2026, Bakı vaxtı 02:00 (UTC 7 okt 22:00)
    const now = new Date('2026-10-07T22:00:00Z')
    assert.equal(periodStart('week', now).toISOString(), '2026-10-04T20:00:00.000Z') // B.e. 5 okt 00:00 Bakı
    assert.equal(periodStart('month', now).toISOString(), '2026-09-30T20:00:00.000Z') // 1 okt 00:00 Bakı
    assert.equal(periodStart('all', now), null)
    // Bazar günü həftənin sonuncu günüdür
    assert.equal(periodStart('week', new Date('2026-10-11T19:00:00Z')).toISOString(), '2026-10-04T20:00:00.000Z')
  })

  it('həftəlik/aylıq lövhə yalnız həmin dövrün xallarını sayır', async () => {
    const adminToken = await createAdmin()
    const users = await registerMany(2)
    const comp = await api
      .post('/api/admin/competitions')
      .set(bearer(adminToken))
      .send({ title: { az: 'Liqa' }, startsAt: '2026-01-01T18:00:00Z', status: 'ONGOING' })
    const id = comp.body.competition.id
    const join = (token, teamName) => api.post(`/api/competitions/${id}/join`).set(bearer(token)).send({ teamName })
    const a = await join(users[0].token, 'Köhnələr')
    const b = await join(users[1].token, 'Yenilər')
    const award = (teamId, amount) =>
      api.post(`/api/admin/teams/${teamId}/points`).set(bearer(adminToken)).send({ amount, reason: 'Tur' })

    // A komandası çoxlu xalı keçən il alıb, B isə bu gün az xal
    await award(a.body.team.id, 50)
    await ctx.prisma.teamPointEntry.updateMany({
      where: { teamId: a.body.team.id },
      data: { createdAt: new Date('2025-01-15T12:00:00Z') },
    })
    await award(b.body.team.id, 5)
    await award(a.body.team.id, 2)

    const board = async (period) => (await api.get(`/api/competitions/${id}${period ? `?period=${period}` : ''}`)).body
    const all = await board()
    assert.equal(all.period, 'all')
    assert.deepEqual(all.leaderboard.map((t) => [t.name, t.points]), [['Köhnələr', 52], ['Yenilər', 5]])

    for (const period of ['week', 'month']) {
      const res = await board(period)
      assert.equal(res.period, period)
      assert.ok(res.periodStart)
      assert.deepEqual(res.leaderboard.map((t) => [t.rank, t.name, t.points]), [[1, 'Yenilər', 5], [2, 'Köhnələr', 2]])
    }
    // Naməlum dövr — ümumi
    assert.equal((await board('il')).period, 'all')
  })
})

describe('oyunlar', () => {
  let adminToken
  beforeEach(async () => {
    adminToken = await createAdmin()
  })
  const upload = async () => {
    const png = await pngImage(800, 600)
    const res = await api.post('/api/admin/images').set(bearer(adminToken)).set('Content-Type', 'image/png').send(png)
    return res.body.image.id
  }
  const createGame = async (body = {}) => {
    const imageId = await upload()
    return api
      .post('/api/admin/games')
      .set(bearer(adminToken))
      .send({ imageId, title: { az: 'Mafia' }, howTo: { az: 'Hər kəs rol alır...' }, players: '6–12', ...body })
  }

  it('admin oyun əlavə edir; saytda yalnız aktivlər, sıra ilə; səhifəsində "necə oynanılır"', async () => {
    const a = await createGame()
    assert.equal(a.status, 201)
    const b = await createGame({ title: { az: 'UNO' }, active: false })
    const c = await createGame({ title: { az: 'Monopoly' }, players: '' })
    assert.equal(c.body.game.players, null)

    const list = await api.get('/api/games')
    assert.deepEqual(list.body.games.map((g) => g.title.az), ['Mafia', 'Monopoly'])
    assert.equal(list.body.games[0].howTo, undefined)

    const one = await api.get(`/api/games/${a.body.game.id}`)
    assert.equal(one.body.game.howTo.az, 'Hər kəs rol alır...')
    assert.equal((await api.get(`/api/games/${b.body.game.id}`)).status, 404)

    const order = await api
      .put('/api/admin/games/order')
      .set(bearer(adminToken))
      .send({ ids: [c.body.game.id, b.body.game.id, a.body.game.id] })
    assert.deepEqual(order.body.games.map((g) => g.title.az), ['Monopoly', 'UNO', 'Mafia'])
  })

  it('şəkli əvəz edəndə və oyunu siləndə şəkil də silinir; işlənən şəkil təkrar bağlanmır', async () => {
    const game = (await createGame()).body.game
    const imagesBefore = await ctx.prisma.image.count()
    const newImage = await upload()
    await api.patch(`/api/admin/games/${game.id}`).set(bearer(adminToken)).send({ imageId: newImage })
    assert.equal(await ctx.prisma.image.count(), imagesBefore) // köhnəsi silindi

    const other = (await createGame()).body.game
    const reuse = await api.patch(`/api/admin/games/${other.id}`).set(bearer(adminToken)).send({ imageId: newImage })
    assert.equal(reuse.body.error.code, 'IMAGE_INVALID')

    assert.equal((await api.delete(`/api/admin/games/${game.id}`).set(bearer(adminToken))).status, 204)
    assert.equal(await ctx.prisma.image.count({ where: { id: newImage } }), 0)
  })
})

describe('slayd: ətraflı səhifə', () => {
  it('mətn varsa hasDetails; ətraflı səhifəsi mətni qaytarır', async () => {
    const adminToken = await createAdmin()
    const png = await pngImage(800, 600)
    const uploaded = await api.post('/api/admin/images').set(bearer(adminToken)).set('Content-Type', 'image/png').send(png)
    const slide = await api
      .post('/api/admin/slides')
      .set(bearer(adminToken))
      .send({ imageId: uploaded.body.image.id, title: { az: 'Kino otağı' }, body: { az: 'Uzun mətn\nikinci sətir' } })
    const list = await api.get('/api/slides')
    assert.equal(list.body.slides[0].hasDetails, true)
    assert.equal(list.body.slides[0].body, undefined)
    const one = await api.get(`/api/slides/${slide.body.slide.id}`)
    assert.equal(one.body.slide.body.az, 'Uzun mətn\nikinci sətir')
  })
})

describe('rəy və təkliflər', () => {
  it('bot tələsi: gizli sahəni dolduran mesaj saxlanmır, amma bot bunu bilmir', async () => {
    const bot = await api.post('/api/feedback').send({ message: 'Ucuz kredit! Buraya bas...', website: 'https://spam.example' })
    assert.equal(bot.status, 201)
    assert.equal(await ctx.prisma.feedback.count(), 0)
  })

  it('hər kəs yaza bilər; admin görür, oxundu edir, silir', async () => {
    const anon = await api.post('/api/feedback').send({ name: 'Leyla', message: 'Daha çox stolüstü oyun olsun!' })
    assert.equal(anon.status, 201)
    const short = await api.post('/api/feedback').send({ message: 'ok' })
    assert.ok(short.body.error.fields.message)

    const { body } = await register()
    await api.post('/api/feedback').set(bearer(body.token)).send({ message: 'Wi-Fi bir az zəifdir.' })

    const adminToken = await createAdmin()
    const list = await api.get('/api/admin/feedback').set(bearer(adminToken))
    assert.equal(list.body.unread, 2)
    const fromUser = list.body.feedback.find((f) => f.user)
    assert.equal(fromUser.user.firstName, 'Aysel')

    await api.patch(`/api/admin/feedback/${fromUser.id}`).set(bearer(adminToken)).send({ read: true })
    const unread = await api.get('/api/admin/feedback?status=unread').set(bearer(adminToken))
    assert.equal(unread.body.feedback.length, 1)
    assert.equal(unread.body.unread, 1)
    assert.equal((await api.delete(`/api/admin/feedback/${fromUser.id}`).set(bearer(adminToken))).status, 204)
    assert.equal((await api.get('/api/admin/feedback').set(bearer(body.token))).status, 403)
  })
})

describe('saytın şəkilləri', () => {
  it('giriş şəkli yüklənir, əvəz olunur (köhnəsi silinir), standarta qaytarılır', async () => {
    const adminToken = await createAdmin()
    assert.deepEqual((await api.get('/api/site')).body.images, { login: null, register: null })
    const put = async (key = 'login') => {
      const png = await pngImage(1200, 900)
      return api.put(`/api/admin/site-images/${key}`).set(bearer(adminToken)).set('Content-Type', 'image/png').send(png)
    }
    const first = await put()
    assert.match(first.body.images.login, /^\/api\/images\//)
    await put()
    assert.equal(await ctx.prisma.image.count(), 1)
    const reset = await api.delete('/api/admin/site-images/login').set(bearer(adminToken))
    assert.equal(reset.body.images.login, null)
    assert.equal(await ctx.prisma.image.count(), 0)
    assert.equal((await put('yox')).status, 404)
  })
})

describe('xəbər göndərmək', () => {
  it('qeydiyyatda və profildə açar; yalnız abunəçilərə; email ayarı yoxdursa xəbərdar edir; WhatsApp üçün siyahı', async () => {
    const yes = await register({ newsletter: true })
    assert.equal(yes.body.user.newsletter, true)
    const no = await register({ email: 'no@mail.com', phone: '501112233', firstName: 'Nərgiz' })
    assert.equal(no.body.user.newsletter, false)
    const blocked = await register({ email: 'b@mail.com', phone: '502223344', newsletter: true })

    // Profildən dəyişmək
    const toggled = await api.patch('/api/auth/me').set(bearer(no.body.token)).send({ newsletter: true })
    assert.equal(toggled.body.user.newsletter, true)

    const adminToken = await createAdmin()
    await api.patch(`/api/admin/users/${blocked.body.user.id}`).set(bearer(adminToken)).send({ blocked: true })

    const info = await api.get('/api/admin/broadcasts').set(bearer(adminToken))
    assert.equal(info.body.subscribers, 2)
    assert.equal(info.body.emailConfigured, false)
    assert.equal((await api.get('/api/admin/users?newsletter=yes').set(bearer(adminToken))).body.total, 3)

    const email = await api
      .post('/api/admin/broadcasts')
      .set(bearer(adminToken))
      .send({ channel: 'email', subject: 'Salam', body: 'Yeni turnir!' })
    assert.equal(email.body.error.code, 'EMAIL_NOT_CONFIGURED')

    const wa = await api
      .post('/api/admin/broadcasts')
      .set(bearer(adminToken))
      .send({ channel: 'whatsapp', body: 'Salam {ad}! Cümə günü UNO turniri var.' })
    assert.equal(wa.status, 201)
    assert.equal(wa.body.broadcast.recipientCount, 2)
    assert.deepEqual(wa.body.recipients.map((r) => r.message), [
      'Salam Aysel! Cümə günü UNO turniri var.',
      'Salam Nərgiz! Cümə günü UNO turniri var.',
    ])

    // Seçilmiş, amma bloklu istifadəçi alıcı sayılmır
    const none = await api
      .post('/api/admin/broadcasts')
      .set(bearer(adminToken))
      .send({ channel: 'whatsapp', body: 'x', userIds: [blocked.body.user.id] })
    assert.equal(none.body.error.code, 'NO_RECIPIENTS')
    assert.equal((await api.get('/api/admin/broadcasts').set(bearer(adminToken))).body.broadcasts.length, 1)
  })
})

describe('günün hesabatı (seanslar)', () => {
  const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString()

  it('qiymət qaydası: ilk saat tam, sonra yarım saat + 10 dəq güzəşt, stop çek', async () => {
    const { visitPrice } = await import('../src/visits.js')
    const hall = { firstHour: 4, nextHour: 3, cap: 13, graceMinutes: 10 }
    const cases = [
      [0, 4],
      [30, 4],
      [60, 4],
      [70, 4], // 1s10d → 1 saat
      [75, 5.5], // 1s15d → 1.5 saat
      [100, 5.5], // 1s40d → 1.5 saat
      [105, 7], // 1s45d → 2 saat
      [130, 7],
      [135, 8.5],
      [600, 13], // stop çek
    ]
    for (const [minutes, amount] of cases) assert.equal(visitPrice({ hall }, minutes).amount, amount, `${minutes} dəq`)
  })

  it('admin qeydiyyatsız və qeydiyyatlı müştəri başladır, bitirir; istifadəçi öz kabinetində görür', async () => {
    const adminToken = await createAdmin()
    const user = (await register()).body

    const guest = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Murad', startedAt: minutesAgo(75) })
    assert.equal(guest.status, 201)
    assert.equal(guest.body.visit.user, null)

    const reg = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ userId: user.user.id, startedAt: minutesAgo(30) })
    assert.equal(reg.status, 201)
    assert.equal(reg.body.visit.name, 'Aysel Məmmədova')

    // Eyni istifadəçinin ikinci aktiv seansı olmaz
    const dup = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ userId: user.user.id })
    assert.equal(dup.status, 409)
    assert.equal(dup.body.error.code, 'VISIT_ACTIVE')

    // İstifadəçi davam edən seansını görür
    let mine = await api.get('/api/auth/me/visits').set(bearer(user.token))
    assert.equal(mine.body.active.id, reg.body.visit.id)
    assert.equal(mine.body.visits.length, 0)

    // Ödəniş üsulu seçilmədən bitmir
    const noMethod = await api.post(`/api/admin/visits/${guest.body.visit.id}/end`).set(bearer(adminToken)).send({})
    assert.equal(noMethod.status, 400)

    // Bitir: 75 dəq → 5.50, nağd
    const end = await api
      .post(`/api/admin/visits/${guest.body.visit.id}/end`)
      .set(bearer(adminToken))
      .send({ paymentMethod: 'cash' })
    assert.equal(end.body.visit.minutes, 75)
    assert.equal(end.body.visit.amount, 5.5)
    assert.equal(end.body.visit.paymentMethod, 'cash')
    const again = await api
      .post(`/api/admin/visits/${guest.body.visit.id}/end`)
      .set(bearer(adminToken))
      .send({ paymentMethod: 'cash' })
    assert.equal(again.status, 409)

    await api.post(`/api/admin/visits/${reg.body.visit.id}/end`).set(bearer(adminToken)).send({ paymentMethod: 'card' })
    mine = await api.get('/api/auth/me/visits').set(bearer(user.token))
    assert.equal(mine.body.active, null)
    // Qeydiyyatlı müştəri — DırDır Club "Tanış" statusu: 5% endirim (4 → 3.8)
    assert.equal(mine.body.visits[0].amount, 3.8)

    // Günün siyahısı və tarixçə. Seanslar "75 və 30 dəqiqə əvvəl" başlayıb — gecə yarısından az sonra işə salınanda
    // fərqli günlərə düşə bilərlər, ona görə hər seansın öz günü ilə yoxlayırıq.
    const list = await api.get('/api/admin/visits').set(bearer(adminToken))
    assert.equal(list.body.day, list.body.today)
    const visitDays = [...new Set([guest.body.visit.day, reg.body.visit.day])]
    let listed = 0
    for (const day of visitDays) listed += (await api.get(`/api/admin/visits?day=${day}`).set(bearer(adminToken))).body.visits.length
    assert.equal(listed, 2)
    const days = await api.get('/api/admin/visits/days').set(bearer(adminToken))
    const sum = (field) => Math.round(days.body.days.reduce((s, d) => s + d[field], 0) * 100) / 100
    assert.deepEqual(days.body.days.map((d) => d.day).sort(), [...visitDays].sort())
    assert.deepEqual({ count: sum('count'), total: sum('total'), cash: sum('cash'), card: sum('card') }, { count: 2, total: 9.3, cash: 5.5, card: 3.8 })

    // İstifadəçi admin ünvanlarına girə bilməz
    assert.equal((await api.get('/api/admin/visits').set(bearer(user.token))).status, 403)
  })

  it('düzəliş məbləği yenidən hesablayır; gələcək vaxt və səhv sıra qəbul olunmur', async () => {
    const adminToken = await createAdmin()
    const { body } = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Leyla', startedAt: minutesAgo(200) })
    const id = body.visit.id
    await api.post(`/api/admin/visits/${id}/end`).set(bearer(adminToken)).send({ paymentMethod: 'cash' })

    const start = new Date(Date.now() - 200 * 60_000)
    const fixed = await api
      .patch(`/api/admin/visits/${id}`)
      .set(bearer(adminToken))
      .send({ endedAt: new Date(start.getTime() + 105 * 60_000).toISOString(), note: '2 çay', paymentMethod: 'card' })
    assert.equal(fixed.status, 200)
    assert.equal(fixed.body.visit.amount, 7)
    assert.equal(fixed.body.visit.note, '2 çay')
    assert.equal(fixed.body.visit.paymentMethod, 'card')

    const backwards = await api.patch(`/api/admin/visits/${id}`).set(bearer(adminToken)).send({ endedAt: minutesAgo(300) })
    assert.equal(backwards.status, 400)

    const future = await api
      .post('/api/admin/visits')
      .set(bearer(adminToken))
      .send({ name: 'X', startedAt: new Date(Date.now() + 3600_000).toISOString() })
    assert.equal(future.status, 400)

    const noName = await api.post('/api/admin/visits').set(bearer(adminToken)).send({})
    assert.equal(noName.status, 400)

    // Davam etdir → yenidən aktiv, sonra sil
    const resumed = await api.post(`/api/admin/visits/${id}/resume`).set(bearer(adminToken))
    assert.equal(resumed.body.visit.endedAt, null)
    assert.equal(resumed.body.visit.paymentMethod, null)
    assert.equal((await api.delete(`/api/admin/visits/${id}`).set(bearer(adminToken))).status, 204)
    assert.equal((await api.get('/api/admin/visits').set(bearer(adminToken))).body.visits.length, 0)
  })

  it('qrup: bir nəfərin adına 5 nəfər — məbləğ nəfər sayına vurulur, stop çek hər nəfərə', async () => {
    const { visitPrice } = await import('../src/visits.js')
    const hall = { firstHour: 4, nextHour: 3, cap: 13, graceMinutes: 10 }
    assert.equal(visitPrice({ hall }, 75, { people: 5 }).amount, 27.5)
    assert.equal(visitPrice({ hall }, 600, { people: 5 }).amount, 65)

    const adminToken = await createAdmin()
    const tooMany = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Qrup', people: 0 })
    assert.equal(tooMany.status, 400)

    const { body } = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Rəşad', people: 5, startedAt: minutesAgo(75) })
    assert.equal(body.visit.people, 5)
    const end = await api.post(`/api/admin/visits/${body.visit.id}/end`).set(bearer(adminToken)).send({ paymentMethod: 'card' })
    assert.equal(end.body.visit.amount, 27.5)

    // Nəfər sayını düzəldəndə məbləğ yenidən hesablanır
    const fixed = await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ people: 3 })
    assert.equal(fixed.body.visit.amount, 16.5)

    const days = await api.get('/api/admin/visits/days').set(bearer(adminToken))
    assert.equal(days.body.days[0].count, 3) // müştəri sayı = nəfərlərin cəmi
  })

  it('kino otağı: otaq qiyməti, tutum həddi, eyni anda bir seans', async () => {
    const { visitPrice } = await import('../src/visits.js')
    const { DEFAULT_PRICING } = await import('../src/pricing.js')
    // Kiçik qrup (2 nəfərə qədər): ilk saat 15, sonrakı saat 10; 1s15d → 1.5 saat → 20
    assert.equal(visitPrice(DEFAULT_PRICING, 75, { people: 2, kind: 'room' }).amount, 20)
    assert.equal(visitPrice(DEFAULT_PRICING, 30, { people: 1, kind: 'room' }).amount, 15)
    // Böyük qrup: saatı 20; 5 nəfərdən sonra hər nəfərə saatda +2 → 7 nəfər, 2 saat: 40 + 2·2·2 = 48
    assert.equal(visitPrice(DEFAULT_PRICING, 120, { people: 7, kind: 'room' }).amount, 48)
    assert.equal(visitPrice(DEFAULT_PRICING, 60, { people: 4, kind: 'room' }).amount, 20)

    const adminToken = await createAdmin()
    const tooMany = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Ailə', kind: 'room', people: 9 })
    assert.equal(tooMany.status, 400)

    const { body } = await api
      .post('/api/admin/visits')
      .set(bearer(adminToken))
      .send({ name: 'Nigar', kind: 'room', people: 7, startedAt: minutesAgo(120) })
    assert.equal(body.visit.kind, 'room')

    const busy = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Elvin', kind: 'room', people: 2 })
    assert.equal(busy.status, 409)
    assert.equal(busy.body.error.code, 'ROOM_BUSY')
    // Zal isə sərbəstdir
    assert.equal((await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Elvin' })).status, 201)

    const end = await api.post(`/api/admin/visits/${body.visit.id}/end`).set(bearer(adminToken)).send({ paymentMethod: 'cash' })
    assert.equal(end.body.visit.amount, 48)

    // Otaq boşaldı — yeni kino seansı başlaya bilər
    const next = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Elvin', kind: 'room', people: 2 })
    assert.equal(next.status, 201)
    // Davam edən seansın yerini dəyişmək olmaz
    const move = await api.patch(`/api/admin/visits/${next.body.visit.id}`).set(bearer(adminToken)).send({ kind: 'hall' })
    assert.equal(move.status, 400)
    // Bitmiş seansı zala keçirmək məbləği yenidən hesablayır: 7 nəfər × 7₼ (2 saat) = 49
    const toHall = await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ kind: 'hall' })
    assert.equal(toHall.body.visit.amount, 49)
    // Otaq məşğulkən köhnə kino seansını davam etdirmək olmur
    await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ kind: 'room' })
    const resume = await api.post(`/api/admin/visits/${body.visit.id}/resume`).set(bearer(adminToken))
    assert.equal(resume.body.error.code, 'ROOM_BUSY')
  })

  it('tələbə endirimi: yalnız zalda, pilləli (2 saat 10%, 3+ saat 20%), yalnız tələbələrin payına', async () => {
    const { visitPrice } = await import('../src/visits.js')
    const { DEFAULT_PRICING } = await import('../src/pricing.js')
    // 3 saat: nəfər başına 10₼; tələbəyə 20% → 8₼
    assert.equal(visitPrice(DEFAULT_PRICING, 180, { people: 1, kind: 'hall', students: 1 }).amount, 8)
    // 2.5 saat — 1-ci pillə (10%): 8.5 − 0.85 = 7.65₼
    assert.equal(visitPrice(DEFAULT_PRICING, 150, { people: 1, kind: 'hall', students: 1 }).amount, 7.65)
    // 2 saat — 10%: 7 − 0.7 = 6.3₼
    assert.equal(visitPrice(DEFAULT_PRICING, 120, { people: 1, kind: 'hall', students: 1 }).amount, 6.3)
    // 1 saat — endirim yoxdur
    const oneHour = visitPrice(DEFAULT_PRICING, 60, { people: 1, kind: 'hall', students: 1 })
    assert.equal(oneHour.amount, 4)
    assert.equal(oneHour.studentEligible, false)
    // 1s40d → 1.5 saat hesablanır — hələ 2 saat deyil, endirim yoxdur
    assert.equal(visitPrice(DEFAULT_PRICING, 100, { people: 1, kind: 'hall', students: 1 }).amount, 5.5)
    // 5 nəfər, 2-si tələbə, 3 saat: 50 − 2·10·20% = 46
    assert.equal(visitPrice(DEFAULT_PRICING, 180, { people: 5, kind: 'hall', students: 2 }).amount, 46)
    // Kino otağında tələbə endirimi yoxdur
    assert.equal(visitPrice(DEFAULT_PRICING, 180, { people: 2, kind: 'room', students: 2 }).amount, 35)

    const adminToken = await createAdmin()
    const tooMany = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Qrup', people: 2, students: 3 })
    assert.equal(tooMany.status, 400)

    const { body } = await api
      .post('/api/admin/visits')
      .set(bearer(adminToken))
      .send({ name: 'Tural', people: 5, students: 2, startedAt: minutesAgo(180) })
    assert.equal(body.visit.students, 2)
    const end = await api.post(`/api/admin/visits/${body.visit.id}/end`).set(bearer(adminToken)).send({ paymentMethod: 'cash' })
    assert.equal(end.body.visit.amount, 46)

    // Tələbə sayını düzəldəndə məbləğ yenidən hesablanır
    const fixed = await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ students: 0 })
    assert.equal(fixed.body.visit.amount, 50)
    // Kino otağına keçəndə tələbə sayı sıfırlanır
    const room = await api
      .post('/api/admin/visits')
      .set(bearer(adminToken))
      .send({ name: 'Səbinə', kind: 'room', people: 2, students: 2 })
    assert.equal(room.body.visit.students, 0)
  })

  it('promokod: bütün məbləğə, tələbə endirimi ilə cəmlənmir, faiz seansa yazılır', async () => {
    const { visitPrice } = await import('../src/visits.js')
    const { DEFAULT_PRICING } = await import('../src/pricing.js')
    // Zal, 1 saat, 2 nəfər: 8₼ − 10% = 7.2
    assert.equal(visitPrice(DEFAULT_PRICING, 60, { people: 2, promoPercent: 10 }).amount, 7.2)
    // Kino otağı: 15₼ − 10% = 13.5
    assert.equal(visitPrice(DEFAULT_PRICING, 60, { people: 2, kind: 'room', promoPercent: 10 }).amount, 13.5)
    // Tələbə (20%) və promokod (10%) — çox olan: tələbə
    const both = visitPrice(DEFAULT_PRICING, 180, { people: 1, students: 1, promoPercent: 10 })
    assert.equal(both.amount, 8)
    assert.equal(both.discountSource, 'student')
    // Promokod çoxdursa — promokod
    assert.equal(visitPrice(DEFAULT_PRICING, 180, { people: 1, students: 1, promoPercent: 50 }).discountSource, 'promo')

    const adminToken = await createAdmin()
    await ctx.prisma.promoCode.create({ data: { code: 'DIRDIR10', percent: 10 } })
    await ctx.prisma.promoCode.create({ data: { code: 'OLD', percent: 30, active: false } })

    const bad = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Ayan', promoCode: 'old' })
    assert.equal(bad.status, 404)
    assert.equal(bad.body.error.code, 'PROMO_NOT_FOUND')

    const { body } = await api
      .post('/api/admin/visits')
      .set(bearer(adminToken))
      .send({ name: 'Ayan', people: 2, promoCode: 'dirdir10', startedAt: minutesAgo(60) })
    assert.equal(body.visit.promoCode, 'DIRDIR10')
    assert.equal(body.visit.promoPercent, 10)

    // Kod sonradan söndürülsə də seansın endirimi qalır
    await ctx.prisma.promoCode.update({ where: { code: 'DIRDIR10' }, data: { active: false } })
    const end = await api.post(`/api/admin/visits/${body.visit.id}/end`).set(bearer(adminToken)).send({ paymentMethod: 'cash' })
    assert.equal(end.body.visit.amount, 7.2)
    // Eyni kodla düzəliş — qalır; null — silinir və məbləğ yenidən hesablanır
    const same = await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ promoCode: 'DIRDIR10', note: 'x' })
    assert.equal(same.body.visit.promoPercent, 10)
    const removed = await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ promoCode: null })
    assert.equal(removed.body.visit.promoCode, null)
    assert.equal(removed.body.visit.amount, 8)
  })

  it('xüsusi endirim: faizlə və ya manatla, ən böyük endirim tətbiq olunur, düzəltmək və silmək olur', async () => {
    const { visitPrice } = await import('../src/visits.js')
    const { DEFAULT_PRICING } = await import('../src/pricing.js')
    // Zal, 1 saat, 2 nəfər (8₼): 25% → 6₼; 3₼ → 5₼; məbləğdən çox manat → 0
    assert.equal(visitPrice(DEFAULT_PRICING, 60, { people: 2, discountType: 'percent', discountValue: 25 }).amount, 6)
    const amount = visitPrice(DEFAULT_PRICING, 60, { people: 2, discountType: 'amount', discountValue: 3 })
    assert.equal(amount.amount, 5)
    assert.equal(amount.discountSource, 'custom')
    assert.equal(visitPrice(DEFAULT_PRICING, 60, { people: 1, discountType: 'amount', discountValue: 50 }).amount, 0)
    // Kino otağı (15₼): 5₼ endirim → 10₼
    assert.equal(visitPrice(DEFAULT_PRICING, 60, { people: 2, kind: 'room', discountType: 'amount', discountValue: 5 }).amount, 10)
    // Tələbə 3 saat (20% = 2₼) və 1₼ xüsusi endirim — böyük olan: tələbə
    const both = visitPrice(DEFAULT_PRICING, 180, { people: 1, students: 1, discountType: 'amount', discountValue: 1 })
    assert.equal(both.amount, 8)
    assert.equal(both.discountSource, 'student')

    const adminToken = await createAdmin()
    const tooBig = await api
      .post('/api/admin/visits')
      .set(bearer(adminToken))
      .send({ name: 'Leyla', discount: { type: 'percent', value: 120 } })
    assert.equal(tooBig.status, 400)
    assert.ok(tooBig.body.error.fields['discount.value'])

    const { body } = await api
      .post('/api/admin/visits')
      .set(bearer(adminToken))
      .send({ name: 'Leyla', people: 2, discount: { type: 'amount', value: 2.5 }, startedAt: minutesAgo(60) })
    assert.equal(body.visit.discountType, 'amount')
    assert.equal(body.visit.discountValue, 2.5)
    const end = await api.post(`/api/admin/visits/${body.visit.id}/end`).set(bearer(adminToken)).send({ paymentMethod: 'card' })
    assert.equal(end.body.visit.amount, 5.5)
    // Faizə dəyişəndə məbləğ yenidən hesablanır; null — silinir
    const percent = await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ discount: { type: 'percent', value: 50 } })
    assert.equal(percent.body.visit.amount, 4)
    const kept = await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ note: 'dost' })
    assert.equal(kept.body.visit.discountValue, 50)
    const removed = await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ discount: null })
    assert.equal(removed.body.visit.discountType, null)
    assert.equal(removed.body.visit.amount, 8)
  })

  it('köhnə tək pilləli tələbə endirimi yeni pilləli qaydaya keçirilir', async () => {
    await ctx.prisma.appSetting.create({
      data: {
        key: 'pricing',
        value: JSON.stringify({
          hall: { firstHour: 4, nextHour: 3, cap: 13, graceMinutes: 10 },
          room: { maxPeople: 8, smallGroup: { maxPeople: 2, firstHour: 15, nextHour: 10 }, group: { perHour: 20, includedPeople: 5, extraPerPerson: 2 } },
          studentDiscount: { percent: 20, minHours: 3 },
        }),
      },
    })
    const res = await api.get('/api/pricing')
    assert.deepEqual(res.body.pricing.studentDiscount, { short: { minHours: 2, percent: 10 }, long: { minHours: 3, percent: 20 } })
    // 2-ci pillənin saatı 1-cidən az ola bilməz
    const adminToken = await createAdmin()
    const bad = await api
      .put('/api/admin/pricing')
      .set(bearer(adminToken))
      .send({ ...res.body.pricing, studentDiscount: { short: { minHours: 3, percent: 10 }, long: { minHours: 2, percent: 20 } } })
    assert.equal(bad.status, 400)
    assert.ok(bad.body.error.fields['studentDiscount.long.minHours'])
  })

  it('köhnə saxlanmış qiymətlərdə güzəşt dəqiqəsi standart 10 olur', async () => {
    await ctx.prisma.appSetting.create({
      data: {
        key: 'pricing',
        value: JSON.stringify({
          hall: { firstHour: 5, nextHour: 3, cap: 15 },
          room: { maxPeople: 8, smallGroup: { maxPeople: 2, firstHour: 15, nextHour: 10 }, group: { perHour: 20, includedPeople: 5, extraPerPerson: 2 } },
          studentDiscount: { percent: 20, minHours: 3 },
        }),
      },
    })
    const res = await api.get('/api/pricing')
    assert.equal(res.body.pricing.hall.firstHour, 5)
    assert.equal(res.body.pricing.hall.graceMinutes, 10)
  })
})

describe('statistika', () => {
  it('günlük və aylıq: gəlir yalnız bitmiş seanslardan, nağd/kart ayrıca; icazə lazımdır', async () => {
    const adminToken = await createAdmin()
    const visit = (day, data) =>
      ctx.prisma.visit.create({ data: { day, name: 'X', startedAt: new Date(`${day}T10:00:00Z`), ...data } })
    const ended = (amount, paymentMethod, extra = {}) => ({ endedAt: new Date('2030-01-01'), minutes: 60, amount, paymentMethod, ...extra })
    await visit('2026-03-05', ended(8, 'cash', { people: 2 }))
    await visit('2026-03-05', ended(15, 'card', { kind: 'room', people: 2 }))
    await visit('2026-03-20', ended(4, 'card'))
    await visit('2026-03-20', { people: 3 }) // davam edir — gəlirə düşmür
    await visit('2026-04-01', ended(10, 'cash'))

    const daily = await api.get('/api/admin/stats?view=daily&month=2026-03').set(bearer(adminToken))
    assert.equal(daily.status, 200)
    assert.equal(daily.body.buckets.length, 31)
    const d5 = daily.body.buckets.find((b) => b.key === '2026-03-05')
    assert.deepEqual([d5.total, d5.cash, d5.card, d5.people, d5.hall, d5.room], [23, 8, 15, 4, 8, 15])
    assert.deepEqual(daily.body.totals, { people: 8, sessions: 4, total: 27, cash: 8, card: 19, other: 0, hall: 12, room: 15 })

    const monthly = await api.get('/api/admin/stats?view=monthly&year=2026').set(bearer(adminToken))
    assert.equal(monthly.body.buckets.length, 12)
    assert.deepEqual(monthly.body.buckets.slice(2, 4).map((b) => b.total), [27, 10])
    assert.equal(monthly.body.totals.total, 37)

    // İcazəsiz admin
    await api.post('/api/admin/admins').set(bearer(adminToken)).send({
      firstName: 'A', lastName: 'B', email: 'a@b.az', phone: '501234560', password: 'parol-2026-x', permissions: ['hesabat'],
    })
    const other = (await api.post('/api/auth/login').send({ email: 'a@b.az', password: 'parol-2026-x' })).body.token
    assert.equal((await api.get('/api/admin/stats').set(bearer(other))).status, 403)
  })
})

describe('yükləmə (export)', () => {
  it('tarix aralığındakı seanslar sıra ilə; səhv aralıq rədd olunur', async () => {
    const adminToken = await createAdmin()
    for (const [day, hour] of [['2026-05-02', 12], ['2026-05-01', 15], ['2026-05-01', 10], ['2026-06-01', 10]]) {
      await ctx.prisma.visit.create({ data: { day, name: `${day} ${hour}`, startedAt: new Date(`${day}T${hour}:00:00Z`) } })
    }
    const res = await api.get('/api/admin/stats/export?from=2026-05-01&to=2026-05-31').set(bearer(adminToken))
    assert.deepEqual(res.body.visits.map((v) => v.name), ['2026-05-01 10', '2026-05-01 15', '2026-05-02 12'])
    assert.equal((await api.get('/api/admin/stats/export?from=2026-05-31&to=2026-05-01').set(bearer(adminToken))).status, 400)
    assert.equal((await api.get('/api/admin/stats/export?from=2024-01-01&to=2026-05-01').set(bearer(adminToken))).status, 400)
  })
})

describe('email dəyişmək', () => {
  it('hazırkı şifrə ilə; yanlış şifrə və tutulmuş email rədd olunur; yeni email ilə giriş', async () => {
    const adminToken = await createAdmin()
    await register()
    const change = (body) => api.post('/api/auth/me/email').set(bearer(adminToken)).send(body)

    assert.equal((await change({ email: 'yeni@dirdir.az', currentPassword: 'yanlis' })).body.error.code, 'WRONG_PASSWORD')
    assert.equal((await change({ email: 'aysel@mail.com', currentPassword: 'admin-password' })).status, 409)

    const ok = await change({ email: 'DirdirAntikafe@Gmail.com', currentPassword: 'admin-password' })
    assert.equal(ok.body.user.email, 'dirdirantikafe@gmail.com')
    assert.equal(ok.body.user.isSuperAdmin, true)
    // Köhnə token işləyir; yeni email ilə daxil olmaq olur
    assert.equal((await api.get('/api/admin/admins').set(bearer(adminToken))).status, 200)
    const login = await api.post('/api/auth/login').send({ login: 'dirdirantikafe@gmail.com', password: 'admin-password' })
    assert.ok(login.body.token)
  })
})

describe('müştəri kodu', () => {
  it('hər istifadəçiyə ardıcıl kod; profildə görünür; adminin axtarışında kodla tapılır', async () => {
    const adminToken = await createAdmin()
    const first = await register()
    const second = await register({ email: 'kamal@mail.com', phone: '0551112233', firstName: 'Kamal' })
    assert.match(first.body.user.customerCode, /^DD\d{4}$/)
    const no = (code) => Number(code.slice(2))
    assert.equal(no(second.body.user.customerCode), no(first.body.user.customerCode) + 1)

    const me = await api.get('/api/auth/me').set(bearer(second.body.token))
    assert.equal(me.body.user.customerCode, second.body.user.customerCode)

    // "DD0003" və "dd-0003" — yalnız bu istifadəçi
    const code = second.body.user.customerCode
    for (const q of [code, code.toLowerCase().replace('dd', 'dd-')]) {
      const res = await api.get(`/api/admin/users?q=${encodeURIComponent(q)}`).set(bearer(adminToken))
      assert.deepEqual(res.body.users.map((u) => u.firstName), ['Kamal'], q)
    }
    // Sadəcə rəqəm telefonlara da uyğun gələ bilər (hər iki nömrədə var) — kodu olan həmişə birincidir,
    // siyahı yeni qeydiyyatdan başlasa da (Kamal daha yenidir)
    const firstNo = no(first.body.user.customerCode)
    const digits = await api.get(`/api/admin/users?q=${firstNo}&limit=1`).set(bearer(adminToken))
    assert.equal(digits.body.users[0].firstName, 'Aysel')
  })
})

describe('hədiyyə çarxı', () => {
  it('yalnız daxil olan fırladır, müddət keçməmiş təkrar olmur, hədiyyə profildə görünür', async () => {
    const guest = await api.get('/api/wheel')
    assert.equal(guest.status, 200)
    assert.equal(guest.body.me, null)
    assert.ok(guest.body.prizes.length >= 2)
    assert.equal(guest.body.prizes[0].chance, undefined) // şanslar gizlidir
    assert.equal((await api.post('/api/wheel/spin')).status, 401)

    const { body: user } = await register()
    const spin = await api.post('/api/wheel/spin').set(bearer(user.token))
    assert.equal(spin.status, 201)
    assert.deepEqual(spin.body.spin.prize, spin.body.prizes[spin.body.index].label)
    assert.ok(new Date(spin.body.nextSpinAt) > new Date(Date.now() + 6 * 24 * 3600 * 1000))

    const again = await api.post('/api/wheel/spin').set(bearer(user.token))
    assert.equal(again.status, 409)
    assert.equal(again.body.error.code, 'WHEEL_WAIT')

    const state = await api.get('/api/wheel').set(bearer(user.token))
    assert.equal(state.body.me.spins.length, 1)
    assert.ok(state.body.me.nextSpinAt)

    // Fırlatma 8 gün əvvəl olubsa — yenidən olar
    await ctx.prisma.wheelSpin.updateMany({ data: { createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000) } })
    assert.equal((await api.post('/api/wheel/spin').set(bearer(user.token))).status, 201)
  })

  it('admin müddəti və hədiyyələri dəyişir, söndürür; hədiyyəni "istifadə olundu" qeyd edir', async () => {
    const adminToken = await createAdmin()
    const { body: user } = await register()

    const bad = await api
      .put('/api/admin/wheel')
      .set(bearer(adminToken))
      .send({ enabled: true, periodDays: 0, prizes: [{ label: { az: 'Tək' }, chance: 1 }] })
    assert.equal(bad.status, 400)
    assert.ok(bad.body.error.fields.periodDays)
    assert.ok(bad.body.error.fields.prizes)

    const saved = await api
      .put('/api/admin/wheel')
      .set(bearer(adminToken))
      .send({ enabled: true, periodDays: 1, prizes: [{ label: { az: 'Çay' }, chance: 1 }, { label: { az: 'Kofe', en: 'Coffee' }, chance: 1 }] })
    assert.equal(saved.status, 200)
    assert.equal(saved.body.wheel.periodDays, 1)
    assert.equal((await api.get('/api/wheel')).body.prizes.length, 2)

    const spin = await api.post('/api/wheel/spin').set(bearer(user.token))
    assert.ok(['Çay', 'Kofe'].includes(spin.body.spin.prize.az))
    // 1 günlük müddət: 25 saat əvvəlki fırlatmadan sonra yenidən olar
    await ctx.prisma.wheelSpin.updateMany({ data: { createdAt: new Date(Date.now() - 25 * 3600 * 1000) } })
    assert.equal((await api.post('/api/wheel/spin').set(bearer(user.token))).status, 201)

    // İstifadəçinin istifadə olunmamış hədiyyələri (Günün hesabatı) və "verildi" qeydi
    const unused = await api.get(`/api/admin/wheel/spins?status=unused&userId=${user.user.id}`).set(bearer(adminToken))
    assert.equal(unused.body.spins.length, 2)
    assert.equal(unused.body.spins[0].user.customerCode, user.user.customerCode)
    const used = await api.patch(`/api/admin/wheel/spins/${unused.body.spins[0].id}`).set(bearer(adminToken)).send({ used: true })
    assert.ok(used.body.spin.usedAt)
    const left = await api.get(`/api/admin/wheel/spins?status=unused&userId=${user.user.id}`).set(bearer(adminToken))
    assert.equal(left.body.spins.length, 1)

    // Söndürüləndə fırlatmaq olmur
    await api.put('/api/admin/wheel').set(bearer(adminToken)).send({ ...saved.body.wheel, enabled: false })
    await ctx.prisma.wheelSpin.deleteMany()
    const off = await api.post('/api/wheel/spin').set(bearer(user.token))
    assert.equal(off.body.error.code, 'WHEEL_OFF')
    // Adi istifadəçi ayarlara baxa bilməz
    assert.equal((await api.get('/api/admin/wheel').set(bearer(user.token))).status, 403)
  })
})

describe('ana səhifənin videosu', () => {
  // Kiçik "MP4": 4-cü baytdan "ftyp" + brend
  const fakeMp4 = () => {
    const buf = Buffer.alloc(4096, 7)
    buf.write('ftypisom', 4, 'latin1')
    return buf
  }

  it('admin yükləyir; sayt ünvanı alır; hissə-hissə (Range) verilir; silinir', async () => {
    const adminToken = await createAdmin()
    assert.equal((await api.get('/api/site')).body.heroVideo, null)

    const notVideo = await api.put('/api/admin/hero-video').set(bearer(adminToken)).set('Content-Type', 'video/mp4').send(Buffer.from('salam dünya, bu video deyil'))
    assert.equal(notVideo.status, 400)
    assert.equal(notVideo.body.error.code, 'VIDEO_INVALID')

    const up = await api.put('/api/admin/hero-video').set(bearer(adminToken)).set('Content-Type', 'video/mp4').send(fakeMp4())
    assert.equal(up.status, 200)
    const url = up.body.url
    assert.match(url, /^\/api\/videos\//)
    assert.equal((await api.get('/api/site')).body.heroVideo, url)

    const full = await api.get(url).buffer(true)
    assert.equal(full.status, 200)
    assert.equal(full.headers['content-type'], 'video/mp4')
    assert.equal(Number(full.headers['content-length']), 4096)

    const part = await api.get(url).set('Range', 'bytes=0-99').buffer(true)
    assert.equal(part.status, 206)
    assert.equal(part.headers['content-range'], 'bytes 0-99/4096')
    assert.equal(Number(part.headers['content-length']), 100)
    assert.equal((await api.get(url).set('Range', 'bytes=5000-')).status, 416)

    // Əvəz edəndə köhnəsi silinir
    const second = await api.put('/api/admin/hero-video').set(bearer(adminToken)).set('Content-Type', 'video/mp4').send(fakeMp4())
    assert.notEqual(second.body.url, url)
    assert.equal(await ctx.prisma.video.count(), 1)

    const removed = await api.delete('/api/admin/hero-video').set(bearer(adminToken))
    assert.equal(removed.body.url, null)
    assert.equal(await ctx.prisma.video.count(), 0)
  })
})

describe('email ilə təsdiq', () => {
  const start = (overrides = {}) => api.post('/api/auth/register').send({ ...aysel, ...overrides })
  const verify = (code, email = 'aysel@mail.com') => api.post('/api/auth/register/verify').send({ email, code })
  const ago = (seconds) => new Date(Date.now() - seconds * 1000)
  const otherThan = (code) => (code === '000000' ? '111111' : '000000')

  it('qeydiyyat: kod emailə gəlir, hesab yalnız təsdiqdən sonra yaranır', async () => {
    const res = await start({ lang: 'en' })
    assert.equal(res.status, 202)
    assert.deepEqual(res.body, { pending: true, email: 'aysel@mail.com' })
    assert.equal(await ctx.prisma.user.count(), 0)

    const mail = mailbox.at(-1)
    const code = codeFor('aysel@mail.com')
    assert.equal(mail.to, 'aysel@mail.com')
    assert.match(mail.subject, /sign-up code/)
    assert.match(mail.from, /noreply@dirdir\.az/)
    assert.ok(mail.html.includes(code))
    // Kodun özü və şifrə bazada açıq saxlanmır
    const stored = JSON.stringify(await ctx.prisma.emailCode.findFirst())
    assert.ok(!stored.includes(code))
    assert.ok(!stored.includes(aysel.password))

    const wrong = await verify(otherThan(code))
    assert.equal(wrong.status, 400)
    assert.equal(wrong.body.error.code, 'CODE_INVALID')
    assert.equal((await verify('12ab')).status, 400)

    const ok = await verify(code)
    assert.equal(ok.status, 201)
    assert.ok(ok.body.token)
    assert.equal(ok.body.user.firstName, 'Aysel')
    assert.equal(ok.body.user.phone, '501234567')
    // Kod birdəfəlikdir; şifrə ilə giriş işləyir
    assert.equal((await verify(code)).body.error.code, 'CODE_EXPIRED')
    const login = await api.post('/api/auth/login').send({ login: 'aysel@mail.com', password: aysel.password })
    assert.equal(login.status, 200)
  })

  it('5 səhv cəhddən sonra kod etibarsızdır; yeni kod bir dəqiqədən sonra; vaxtı keçən kod işləmir', async () => {
    await start()
    const good = codeFor('aysel@mail.com')
    for (let i = 0; i < 5; i++) await verify(otherThan(good))
    assert.equal((await verify(good)).body.error.code, 'CODE_EXPIRED')

    // Dərhal yeni kod — olmaz; bir dəqiqə sonra — olar
    const soon = await api.post('/api/auth/register/resend').send({ email: 'aysel@mail.com' })
    assert.equal(soon.status, 429)
    await ctx.prisma.emailCode.updateMany({ data: { createdAt: ago(61) } })
    const resend = await api.post('/api/auth/register/resend').send({ email: 'aysel@mail.com', lang: 'ru' })
    assert.equal(resend.status, 200)
    assert.match(mailbox.at(-1).subject, /Код регистрации/)
    const fresh = codeFor('aysel@mail.com')

    // 15 dəqiqədən köhnə kod işləmir
    await ctx.prisma.emailCode.updateMany({ data: { expiresAt: ago(1) } })
    assert.equal((await verify(fresh)).body.error.code, 'CODE_EXPIRED')
    assert.equal(await ctx.prisma.user.count(), 0)
  })

  it('kod gözləyərkən eyni email başqası tərəfindən tutulubsa — hesab yaranmır', async () => {
    await start()
    const code = codeFor('aysel@mail.com')
    await ctx.prisma.user.create({ data: { firstName: 'X', lastName: 'Y', email: 'aysel@mail.com', phone: '559998877', passwordHash: 'x' } })
    const res = await verify(code)
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, 'ACCOUNT_EXISTS')
  })

  it('şifrə bərpası: kod emailə gəlir, yeni şifrə işləyir, köhnə sessiyalar bağlanır', async () => {
    const { body } = await register()
    mailbox.length = 0

    // Olmayan email — cavab eynidir, amma məktub getmir
    const ghost = await api.post('/api/auth/password/forgot').send({ email: 'yoxdur@mail.com' })
    assert.equal(ghost.status, 200)
    const forgot = await api.post('/api/auth/password/forgot').send({ email: 'AYSEL@mail.com' })
    assert.equal(forgot.status, 200)
    assert.deepEqual(Object.keys(ghost.body).sort(), Object.keys(forgot.body).sort())
    await new Promise((r) => setTimeout(r, 100)) // məktub fonda göndərilir
    assert.equal(mailbox.length, 1)
    assert.equal(mailbox[0].to, 'aysel@mail.com')
    assert.match(mailbox[0].subject, /Şifrəni bərpa et/)

    const code = codeFor('aysel@mail.com')
    const short = await api.post('/api/auth/password/reset').send({ email: 'aysel@mail.com', code, newPassword: '123' })
    assert.equal(short.status, 400)

    await new Promise((r) => setTimeout(r, 1100)) // köhnə tokenin "iat"-ı şifrə dəyişmə anından əvvəl olsun
    const reset = await api.post('/api/auth/password/reset').send({ email: 'aysel@mail.com', code, newPassword: 'yeni-sifre-2026' })
    assert.equal(reset.status, 200)
    assert.ok(reset.body.token)

    assert.equal((await api.get('/api/auth/me').set(bearer(body.token))).status, 401)
    assert.equal((await api.get('/api/auth/me').set(bearer(reset.body.token))).status, 200)
    assert.equal((await api.post('/api/auth/login').send({ login: 'aysel@mail.com', password: aysel.password })).status, 401)
    assert.equal((await api.post('/api/auth/login').send({ login: 'aysel@mail.com', password: 'yeni-sifre-2026' })).status, 200)
    // Kod birdəfəlikdir
    const again = await api.post('/api/auth/password/reset').send({ email: 'aysel@mail.com', code, newPassword: 'basqa-sifre-1' })
    assert.equal(again.body.error.code, 'CODE_EXPIRED')
  })

  it('bərpa kodu qeydiyyat kodu kimi işləmir', async () => {
    await register()
    await api.post('/api/auth/password/forgot').send({ email: 'aysel@mail.com' })
    await new Promise((r) => setTimeout(r, 100))
    const asRegister = await verify(codeFor('aysel@mail.com'))
    assert.equal(asRegister.status, 400)
  })
})

describe('beh (əvvəlcədən ödəniş)', () => {
  it('beh öz üsulunda, qalıq bitəndə seçilən üsulda sayılır; düzəltmək və silmək olur', async () => {
    const adminToken = await createAdmin()
    const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString()

    const bad = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ name: 'Leyla', deposit: { amount: 0, method: 'cash' } })
    assert.equal(bad.status, 400)
    assert.ok(bad.body.error.fields['deposit.amount'])

    // Kino otağı, 2 nəfər, 1 saat = 15₼; beh 10₼ nağd, qalıq 5₼ kartla
    const { body } = await api
      .post('/api/admin/visits')
      .set(bearer(adminToken))
      .send({ name: 'Leyla', kind: 'room', people: 2, deposit: { amount: 10, method: 'cash' }, startedAt: minutesAgo(60) })
    assert.equal(body.visit.deposit, 10)
    assert.equal(body.visit.depositMethod, 'cash')
    const end = await api.post(`/api/admin/visits/${body.visit.id}/end`).set(bearer(adminToken)).send({ paymentMethod: 'card' })
    assert.equal(end.body.visit.amount, 15) // beh məbləği dəyişmir

    const day = end.body.visit.day
    const days = await api.get('/api/admin/visits/days').set(bearer(adminToken))
    const row = days.body.days.find((d) => d.day === day)
    assert.equal(row.total, 15)
    assert.equal(row.cash, 10)
    assert.equal(row.card, 5)

    const stats = await api.get(`/api/admin/stats?view=daily&month=${day.slice(0, 7)}`).set(bearer(adminToken))
    assert.equal(stats.body.totals.cash, 10)
    assert.equal(stats.body.totals.card, 5)

    // Beh kartla olubsa — hamısı kart; beh silinəndə — hamısı bitəndə seçilən üsulda
    const fixed = await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ deposit: { amount: 10, method: 'card' } })
    assert.equal(fixed.body.visit.depositMethod, 'card')
    let after = (await api.get('/api/admin/visits/days').set(bearer(adminToken))).body.days.find((d) => d.day === day)
    assert.equal(after.cash, 0)
    assert.equal(after.card, 15)
    const removed = await api.patch(`/api/admin/visits/${body.visit.id}`).set(bearer(adminToken)).send({ deposit: null })
    assert.equal(removed.body.visit.deposit, null)
    after = (await api.get('/api/admin/visits/days').set(bearer(adminToken))).body.days.find((d) => d.day === day)
    assert.equal(after.card, 15)

    // Beh məbləğdən çoxdursa — fərq qaytarılır (mənfi qalıq)
    const { paymentSplit } = await import('../src/visits.js')
    assert.deepEqual(
      paymentSplit({ endedAt: new Date(), amount: 8, deposit: 10, depositMethod: 'cash', paymentMethod: 'cash' }),
      { cash: 8, card: 0, other: 0 },
    )
    assert.deepEqual(
      paymentSplit({ endedAt: new Date(), amount: 8, deposit: 10, depositMethod: 'card', paymentMethod: 'cash' }),
      { cash: -2, card: 10, other: 0 },
    )
  })
})

describe('DırDır Club', () => {
  const dayAgo = (n) => {
    const d = new Date(Date.now() + 4 * 3600 * 1000) // Bakı vaxtı
    d.setUTCDate(d.getUTCDate() - n)
    return d.toISOString().slice(0, 10)
  }
  // Bitmiş seans (ödənişli və ya pulsuz) — status yalnız ödənişli, fərqli günləri sayır
  const pastVisit = (userId, day, amount = 8) =>
    ctx.prisma.visit.create({
      data: { userId, name: 'X', day, startedAt: new Date(`${day}T10:00:00Z`), endedAt: new Date(`${day}T12:00:00Z`), minutes: 120, amount, paymentMethod: 'cash' },
    })
  const setClub = async (adminToken, patch) => {
    const { body } = await api.get('/api/admin/club').set(bearer(adminToken))
    const res = await api.put('/api/admin/club').set(bearer(adminToken)).send({ ...body.club, ...patch })
    assert.equal(res.status, 200, JSON.stringify(res.body))
    return res.body.club
  }

  it('status son aylarda fərqli ödənişli günlərə görə; kabinetdə növbəti statusa qalan görünür', async () => {
    const adminToken = await createAdmin()
    const { body: user } = await register()
    await setClub(adminToken, { startDay: dayAgo(400) })

    // 9 fərqli gün + eyni gündə ikinci seans + pulsuz seans + 7 ay əvvəlki seans — 9 sayılır (Qonaq)
    for (let i = 1; i <= 9; i++) await pastVisit(user.user.id, dayAgo(i * 3))
    await pastVisit(user.user.id, dayAgo(3))
    await pastVisit(user.user.id, dayAgo(40), 0)
    await pastVisit(user.user.id, dayAgo(220))

    const res = await api.get('/api/club').set(bearer(user.token))
    assert.equal(res.status, 200)
    assert.equal(res.body.me.visits, 9)
    assert.equal(res.body.me.tier.key, 'qonaq')
    assert.equal(res.body.me.tier.hallPercent, 10)
    assert.equal(res.body.me.next.key, 'sakin')
    assert.equal(res.body.me.next.needed, 6)
    assert.ok(res.body.me.leavesOn)
    assert.equal(res.body.club.tiers.length, 4)
    // Qonaq — kabinet yoxdur, qaydalar var
    const guest = await api.get('/api/club')
    assert.equal(guest.body.me, null)

    // Admin axtarışında status görünür
    const list = await api.get('/api/admin/users?q=Aysel').set(bearer(adminToken))
    assert.equal(list.body.users[0].club.tier.key, 'qonaq')

    // Club işə düşməzdən əvvəlki ziyarətlər sayılmır
    await setClub(adminToken, { startDay: dayAgo(10) })
    assert.equal((await api.get('/api/club').set(bearer(user.token))).body.me.visits, 3)
  })

  it('status endirimi seansa yazılır: zalda öz payına (və ya qrupa), kinoda bütün otağa; söndürüləndə yoxdur', async () => {
    const adminToken = await createAdmin()
    const { body: user } = await register()
    await setClub(adminToken, { startDay: dayAgo(400) })
    for (let i = 1; i <= 15; i++) await pastVisit(user.user.id, dayAgo(i)) // Sakin — 15%
    const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString()
    const start = (body) => api.post('/api/admin/visits').set(bearer(adminToken)).send({ userId: user.user.id, startedAt: minutesAgo(60), ...body })
    const end = (id) => api.post(`/api/admin/visits/${id}/end`).set(bearer(adminToken)).send({ paymentMethod: 'cash' })

    // Zal, 2 nəfər, 1 saat = 8₼; 15% yalnız müştərinin öz payına (4₼) → 0.6 endirim
    const hall = await start({ people: 2 })
    assert.equal(hall.body.visit.club.tier, 'sakin')
    assert.equal(hall.body.visit.club.hallPercent, 15)
    assert.equal((await end(hall.body.visit.id)).body.visit.amount, 7.4)

    // Qrup rejimi: bütün qrupa → 8 − 1.2 = 6.8
    await setClub(adminToken, { group: true })
    const group = await start({ people: 2 })
    assert.equal((await end(group.body.visit.id)).body.visit.amount, 6.8)

    // Kino otağı (15₼): 15% → 12.75; promokod 20% çoxdur — o tətbiq olunur (cəmlənmir)
    await ctx.prisma.promoCode.create({ data: { code: 'BIG20', percent: 20 } })
    const room = await start({ kind: 'room', people: 2 })
    assert.equal((await end(room.body.visit.id)).body.visit.amount, 12.75)
    const promo = await start({ kind: 'room', people: 2, promoCode: 'BIG20' })
    assert.equal((await end(promo.body.visit.id)).body.visit.amount, 12)

    // "Cəmlənsin" rejimi: 20% + 15% → 15 − 3 − 2.25 = 9.75
    await setClub(adminToken, { combine: 'stack' })
    const stacked = await start({ kind: 'room', people: 2, promoCode: 'BIG20' })
    assert.equal((await end(stacked.body.visit.id)).body.visit.amount, 9.75)

    // Club söndürülüb — endirim yoxdur, kabinetdə status yoxdur
    await setClub(adminToken, { enabled: false })
    const off = await start({})
    assert.equal(off.body.visit.club, null)
    assert.equal((await end(off.body.visit.id)).body.visit.amount, 4)
    assert.equal((await api.get('/api/club').set(bearer(user.token))).body.me, null)
  })

  it('ayarlar yoxlanılır: birinci status 0-dan, hədlər artan, faiz maksimumdan çox deyil; icazə lazımdır', async () => {
    const adminToken = await createAdmin()
    const { body: user } = await register()
    const { body } = await api.get('/api/admin/club').set(bearer(adminToken))
    const tiers = body.club.tiers

    const badStart = await api.put('/api/admin/club').set(bearer(adminToken)).send({ ...body.club, tiers: tiers.map((t, i) => (i === 0 ? { ...t, minVisits: 1 } : t)) })
    assert.ok(badStart.body.error.fields['tiers.0.minVisits'])
    const badOrder = await api.put('/api/admin/club').set(bearer(adminToken)).send({ ...body.club, tiers: tiers.map((t, i) => (i === 2 ? { ...t, minVisits: 5 } : t)) })
    assert.ok(badOrder.body.error.fields['tiers.2.minVisits'])
    const tooMuch = await api.put('/api/admin/club').set(bearer(adminToken)).send({ ...body.club, tiers: tiers.map((t, i) => (i === 3 ? { ...t, hallPercent: 30 } : t)) })
    assert.ok(tooMuch.body.error.fields['tiers.3.hallPercent'])

    // Kartı redaktə: ad, endirim, üstünlüklər, hədiyyələr; yeni status əlavə etmək
    const edited = await api
      .put('/api/admin/club')
      .set(bearer(adminToken))
      .send({
        ...body.club,
        tiers: [
          ...tiers.map((t, i) => (i === 1 ? { ...t, name: { az: 'Dost', en: '', ru: '' }, hallPercent: 12, benefits: [{ az: 'Pulsuz çay' }], gifts: [{ az: 'Tort' }] } : t)),
          { key: 'efsane', name: { az: 'Əfsanə' }, icon: '👑', color: 'yellow', minVisits: 40, hallPercent: 20, roomPercent: 20, benefits: [], gifts: [] },
        ],
      })
    assert.equal(edited.status, 200, JSON.stringify(edited.body))
    assert.equal(edited.body.club.tiers[1].name.az, 'Dost')
    assert.equal(edited.body.club.tiers[1].gifts[0].az, 'Tort')
    assert.equal(edited.body.club.tiers.length, 5)
    assert.equal((await api.get('/api/club')).body.club.tiers[4].name.az, 'Əfsanə')

    assert.equal((await api.get('/api/admin/club').set(bearer(user.token))).status, 403)
  })
})

describe('DırDır Club — admin status verir', () => {
  const dayAgo = (n) => {
    const d = new Date(Date.now() + 4 * 3600 * 1000)
    d.setUTCDate(d.getUTCDate() - n)
    return d.toISOString().slice(0, 10)
  }
  const pastVisit = (userId, day) =>
    ctx.prisma.visit.create({
      data: { userId, name: 'X', day, startedAt: new Date(`${day}T10:00:00Z`), endedAt: new Date(`${day}T12:00:00Z`), minutes: 120, amount: 8, paymentMethod: 'cash' },
    })

  it('verilən status başlanğıcdır: gəldikcə artır, bonus vaxtı bitəndə azalır; aşağı salmaq və ləğv etmək olur', async () => {
    const adminToken = await createAdmin()
    const { body: user } = await register()
    const { body } = await api.get('/api/admin/club').set(bearer(adminToken))
    await api.put('/api/admin/club').set(bearer(adminToken)).send({ ...body.club, startDay: dayAgo(400) })
    const give = (tier, token = adminToken) => api.put(`/api/admin/club-members/${user.user.id}`).set(bearer(token)).send({ tier })
    const me = async () => (await api.get('/api/club').set(bearer(user.token))).body.me

    assert.equal((await give('yoxdur')).status, 400)
    assert.equal((await give('sakin', user.token)).status, 403)

    // 0 ziyarətli müştəriyə Sakin (15) — bonus 15
    const res = await give('sakin')
    assert.equal(res.status, 200)
    assert.equal(res.body.club.tier.key, 'sakin')
    assert.equal(res.body.club.realVisits, 0)
    assert.equal(res.body.club.given.bonus, 15)
    let status = await me()
    assert.equal(status.tier.key, 'sakin')
    assert.equal(status.next.key, 'ev-sahibi')
    assert.equal(status.next.needed, 10)

    // Seansa Sakin endirimi yazılır: zal 1 saat 4₼ − 15% = 3.4
    const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString()
    const visit = await api.post('/api/admin/visits').set(bearer(adminToken)).send({ userId: user.user.id, startedAt: minutesAgo(60) })
    assert.equal(visit.body.visit.club.tier, 'sakin')
    assert.equal((await api.post(`/api/admin/visits/${visit.body.visit.id}/end`).set(bearer(adminToken)).send({ paymentMethod: 'cash' })).body.visit.amount, 3.4)

    // Gəldikcə artır: daha 9 fərqli gün (yuxarıdakı seansla 10) — Ev sahibi. 2–10 gün əvvəl: gecə yarısından sonra
    // "60 dəqiqə əvvəl" başlayan seans dünənə düşə bilər, onunla eyni gün olmasın
    for (let i = 2; i <= 10; i++) await pastVisit(user.user.id, dayAgo(i))
    status = await me()
    assert.equal(status.visits, 25)
    assert.equal(status.tier.key, 'ev-sahibi')

    // Bonusun vaxtı bitdi — yalnız həqiqi ziyarətlər qalır (10 — Qonaq)
    await ctx.prisma.user.update({ where: { id: user.user.id }, data: { clubBonusUntil: dayAgo(1) } })
    status = await me()
    assert.equal(status.visits, 10)
    assert.equal(status.tier.key, 'qonaq')
    assert.equal(status.given, null)

    // Aşağı salmaq: 10 ziyarətli (Qonaq) müştəriyə Tanış — bonus −10
    const down = await give('tanish')
    assert.equal(down.body.club.given.bonus, -10)
    assert.equal(down.body.club.tier.key, 'tanish')
    assert.equal((await me()).visits, 0)

    // Ləğv — yenə ziyarətlərə görə
    const cleared = await give(null)
    assert.equal(cleared.body.club.given, null)
    assert.equal(cleared.body.club.tier.key, 'qonaq')
  })
})

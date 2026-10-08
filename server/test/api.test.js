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

const register = (overrides = {}) => api.post('/api/auth/register').send({ ...aysel, ...overrides })
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
})
after(() => ctx.stop())
beforeEach(() => ctx.reset())

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

    const ok = await api.post('/api/auth/me/password').set(bearer(token)).send({ currentPassword: aysel.password, newPassword: 'yeni-sifre-1' })
    assert.equal(ok.status, 204)
    assert.equal((await api.post('/api/auth/login').send({ email: aysel.email, password: aysel.password })).status, 401)
    assert.equal((await api.post('/api/auth/login').send({ email: aysel.email, password: 'yeni-sifre-1' })).status, 200)
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

  it('admin yeni hesab açır (istifadəçi və ya admin); təkrar email/telefon rədd olunur', async () => {
    const created = await api.post('/api/admin/users').set(bearer(adminToken)).send({
      firstName: 'Nərmin',
      lastName: 'Əliyeva',
      email: 'Narmin@Dirdir.az',
      phone: '070 555 44 33',
      password: 'isci-sifre-2026',
      role: 'ADMIN',
    })
    assert.equal(created.status, 201)
    assert.equal(created.body.user.role, 'ADMIN')
    assert.equal(created.body.user.email, 'narmin@dirdir.az')
    assert.equal(created.body.user.passwordHash, undefined)

    // Yeni admin daxil olub paneldən istifadə edə bilir
    const login = await api.post('/api/auth/login').send({ email: 'narmin@dirdir.az', password: 'isci-sifre-2026' })
    assert.equal((await api.get('/api/admin/users').set(bearer(login.body.token))).status, 200)

    const plain = await api.post('/api/admin/users').set(bearer(adminToken)).send({
      firstName: 'Kamran',
      lastName: 'Həsənov',
      email: 'kamran@mail.com',
      phone: '+994 77 111 22 33',
      password: 'kamran-2026',
    })
    assert.equal(plain.body.user.role, 'USER')

    const dup = await api.post('/api/admin/users').set(bearer(adminToken)).send({
      firstName: 'X',
      lastName: 'Y',
      email: 'kamran@mail.com',
      phone: '+994 77 111 22 33',
      password: 'whatever-123',
    })
    assert.equal(dup.status, 409)
    assert.deepEqual(dup.body.error.fieldCodes, { email: 'EMAIL_TAKEN', phone: 'PHONE_TAKEN' })

    const bad = await api.post('/api/admin/users').set(bearer(adminToken)).send({ email: 'yox', role: 'BOSS' })
    assert.equal(bad.status, 400)
    assert.ok(bad.body.error.fields.firstName && bad.body.error.fields.password && bad.body.error.fields.role)
  })

  it('admin etmək / adminlikdən çıxarmaq; öz rolunu dəyişmək olmur; admini əvvəl çıxarmadan silmək olmur', async () => {
    const target = users[0]
    const patch = (id, body) => api.patch(`/api/admin/users/${id}`).set(bearer(adminToken)).send(body)

    // Bloklu istifadəçi admin olanda blok açılır
    await patch(target.user.id, { blocked: true })
    const promoted = await patch(target.user.id, { role: 'ADMIN' })
    assert.equal(promoted.body.user.role, 'ADMIN')
    assert.equal(promoted.body.user.blocked, false)
    assert.equal((await api.get('/api/admin/users').set(bearer(target.token))).status, 200)

    assert.equal((await patch(target.user.id, { blocked: true })).body.error.code, 'CANNOT_MODIFY_ADMIN')
    assert.equal((await api.delete(`/api/admin/users/${target.user.id}`).set(bearer(adminToken))).body.error.code, 'CANNOT_MODIFY_ADMIN')

    // Admin öz rolunu dəyişə bilməz
    const self = await api.patch(`/api/admin/users/${target.user.id}`).set(bearer(target.token)).send({ role: 'USER' })
    assert.equal(self.body.error.code, 'CANNOT_MODIFY_SELF')

    const demoted = await patch(target.user.id, { role: 'USER' })
    assert.equal(demoted.body.user.role, 'USER')
    // Köhnə tokenlə panel dərhal bağlanır
    assert.equal((await api.get('/api/admin/users').set(bearer(target.token))).status, 403)
    assert.equal((await api.delete(`/api/admin/users/${target.user.id}`).set(bearer(adminToken))).status, 204)

    assert.equal((await patch(users[1].user.id, {})).status, 400)
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

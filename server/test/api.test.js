import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
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

  it('naməlum ünvan 404 qaytarır', async () => {
    const res = await api.get('/api/yoxdur')
    assert.equal(res.status, 404)
    assert.ok(res.body.error.message)
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
    assert.equal(res.body.user.points, 0)
    assert.equal(res.body.user.passwordHash, undefined)
  })

  it('yanlış sahələri ayrı-ayrı göstərir', async () => {
    const res = await register({ firstName: ' ', email: 'yanlis', phone: '12 345', password: '123' })
    assert.equal(res.status, 400)
    assert.deepEqual(Object.keys(res.body.error.fields).sort(), ['email', 'firstName', 'password', 'phone'])
  })

  it('naməlum operator kodunu qəbul etmir', async () => {
    const res = await register({ phone: '0211234567' })
    assert.equal(res.status, 400)
    assert.ok(res.body.error.fields.phone)
  })

  it('təkrar email və telefonu 409 ilə bildirir', async () => {
    await register()
    const sameEmail = await register({ email: 'AYSEL@mail.com', phone: '551112233' })
    assert.equal(sameEmail.status, 409)
    assert.ok(sameEmail.body.error.fields.email)
    assert.equal(sameEmail.body.error.fields.phone, undefined)

    const samePhone = await register({ email: 'basqa@mail.com', phone: '050 123 45 67' })
    assert.equal(samePhone.status, 409)
    assert.ok(samePhone.body.error.fields.phone)
  })
})

describe('giriş', () => {
  beforeEach(() => register())

  it('email böyük/kiçik hərfdən asılı deyil', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'AYSEL@MAIL.COM', password: aysel.password })
    assert.equal(res.status, 200)
    assert.ok(res.body.token)
  })

  it('yanlış şifrə və naməlum email eyni cavabı alır', async () => {
    const wrongPass = await api.post('/api/auth/login').send({ email: aysel.email, password: 'yanlis-sifre' })
    const unknown = await api.post('/api/auth/login').send({ email: 'yox@mail.com', password: 'yanlis-sifre' })
    assert.equal(wrongPass.status, 401)
    assert.equal(unknown.status, 401)
    assert.equal(wrongPass.body.error.message, unknown.body.error.message)
  })

  it('/me tokensiz və pozuq tokenlə 401, düzgün tokenlə profil qaytarır', async () => {
    assert.equal((await api.get('/api/auth/me')).status, 401)
    assert.equal((await api.get('/api/auth/me').set(bearer('pozuq.token.burada'))).status, 401)

    const { body } = await api.post('/api/auth/login').send({ email: aysel.email, password: aysel.password })
    const me = await api.get('/api/auth/me').set(bearer(body.token))
    assert.equal(me.status, 200)
    assert.equal(me.body.user.firstName, 'Aysel')
  })

  it('silinmiş hesabın tokeni işləmir', async () => {
    const { body } = await api.post('/api/auth/login').send({ email: aysel.email, password: aysel.password })
    await ctx.prisma.user.deleteMany()
    assert.equal((await api.get('/api/auth/me').set(bearer(body.token))).status, 401)
  })
})

describe('admin icazələri', () => {
  it('adi istifadəçi admin ünvanlarına girə bilmir', async () => {
    const { body } = await register()
    assert.equal((await api.get('/api/admin/users').set(bearer(body.token))).status, 403)
    assert.equal((await api.get('/api/admin/promo-codes')).status, 401)
  })
})

describe('Arena xalları', () => {
  let adminToken
  let users

  beforeEach(async () => {
    adminToken = await createAdmin()
    users = []
    const people = [
      ['Aysel', 'Məmmədova', 'aysel@mail.com', '501111111'],
      ['Murad', 'Əliyev', 'murad@mail.com', '502222222'],
      ['Leyla', 'Həsənova', 'leyla@mail.com', '503333333'],
      ['Nihat', 'Quliyev', 'nihat@mail.com', '504444444'],
    ]
    for (const [firstName, lastName, email, phone] of people) {
      const res = await register({ firstName, lastName, email, phone })
      users.push(res.body)
    }
  })

  const award = (userId, amount, reason = 'Turnir') =>
    api.post(`/api/admin/users/${userId}/points`).set(bearer(adminToken)).send({ amount, reason })

  it('admin xal verir, tarixçə yazılır', async () => {
    const res = await award(users[0].user.id, 50, 'UNO turniri — 1-ci yer')
    assert.equal(res.status, 201)
    assert.equal(res.body.user.points, 50)

    const history = await api.get(`/api/admin/users/${users[0].user.id}/points`).set(bearer(adminToken))
    assert.equal(history.body.entries.length, 1)
    assert.equal(history.body.entries[0].reason, 'UNO turniri — 1-ci yer')
    assert.equal(history.body.entries[0].createdBy.firstName, 'Admin')
  })

  it('xal 0-dan aşağı düşə bilməz', async () => {
    await award(users[0].user.id, 10)
    const res = await award(users[0].user.id, -11)
    assert.equal(res.status, 400)
    const me = await api.get('/api/auth/me').set(bearer(users[0].token))
    assert.equal(me.body.user.points, 10)
  })

  it('eyni anda gələn dəyişikliklər itmir', async () => {
    await Promise.all(Array.from({ length: 10 }, () => award(users[0].user.id, 5)))
    const me = await api.get('/api/auth/me').set(bearer(users[0].token))
    assert.equal(me.body.user.points, 50)
  })

  it('naməlum istifadəçiyə xal 404', async () => {
    assert.equal((await award('yoxdur', 5)).status, 404)
  })

  it('lövhə: yalnız xalı olanlar, çoxdan aza, bərabərdə əvvəl qeydiyyatdan keçən', async () => {
    await award(users[0].user.id, 30)
    await award(users[1].user.id, 80)
    await award(users[2].user.id, 30)

    const res = await api.get('/api/arena/leaderboard')
    assert.equal(res.status, 200)
    assert.deepEqual(
      res.body.leaderboard.map((r) => [r.rank, r.name, r.points]),
      [
        [1, 'Murad Ə.', 80],
        [2, 'Aysel M.', 30],
        [3, 'Leyla H.', 30],
      ],
    )
    // Lövhədə email/telefon çıxmır
    assert.equal(res.body.leaderboard[0].email, undefined)
  })

  it('istifadəçi öz yerini görür', async () => {
    await award(users[0].user.id, 30)
    await award(users[1].user.id, 80)

    const aysel = await api.get('/api/arena/me').set(bearer(users[0].token))
    assert.equal(aysel.body.rank, 2)
    assert.equal(aysel.body.points, 30)

    const nihat = await api.get('/api/arena/me').set(bearer(users[3].token))
    assert.equal(nihat.body.rank, null)
  })
})

describe('promokodlar', () => {
  let adminToken
  beforeEach(async () => {
    adminToken = await createAdmin()
  })

  const create = (body) => api.post('/api/admin/promo-codes').set(bearer(adminToken)).send(body)
  const validate = (code) => api.post('/api/promo/validate').send({ code })

  it('admin kod yaradır, kod böyük hərflə saxlanır və yoxlanır', async () => {
    const res = await create({ code: 'yay2026', percent: 15 })
    assert.equal(res.status, 201)
    assert.equal(res.body.promoCode.code, 'YAY2026')

    const ok = await validate(' Yay2026 ')
    assert.equal(ok.status, 200)
    assert.deepEqual(ok.body, { code: 'YAY2026', percent: 15 })
  })

  it('təkrar kod 409, yanlış faiz 400', async () => {
    await create({ code: 'YAY2026', percent: 15 })
    assert.equal((await create({ code: 'yay2026', percent: 10 })).status, 409)
    assert.equal((await create({ code: 'BOYUK', percent: 150 })).status, 400)
    assert.equal((await create({ code: 'a', percent: 10 })).status, 400)
  })

  it('deaktiv, vaxtı keçmiş və naməlum kod tapılmır', async () => {
    const off = await create({ code: 'SONDU', percent: 10 })
    await api.patch(`/api/admin/promo-codes/${off.body.promoCode.id}`).set(bearer(adminToken)).send({ active: false })
    await create({ code: 'KECDI', percent: 10, expiresAt: '2020-01-01T00:00:00Z' })
    await create({ code: 'GELECEK', percent: 10, expiresAt: '2999-01-01T00:00:00Z' })

    assert.equal((await validate('SONDU')).status, 404)
    assert.equal((await validate('KECDI')).status, 404)
    assert.equal((await validate('YOXDUR')).status, 404)
    assert.equal((await validate('GELECEK')).status, 200)
  })

  it('kodların siyahısı yalnız adminə görünür, silmək işləyir', async () => {
    const res = await create({ code: 'SIL', percent: 5 })
    const list = await api.get('/api/admin/promo-codes').set(bearer(adminToken))
    assert.equal(list.body.promoCodes.length, 1)

    const del = await api.delete(`/api/admin/promo-codes/${res.body.promoCode.id}`).set(bearer(adminToken))
    assert.equal(del.status, 204)
    assert.equal((await validate('SIL')).status, 404)
    assert.equal(
      (await api.delete(`/api/admin/promo-codes/${res.body.promoCode.id}`).set(bearer(adminToken))).status,
      404,
    )
  })
})

describe('admin istifadəçi axtarışı', () => {
  it('ad, email və telefona görə tapır', async () => {
    const adminToken = await createAdmin()
    await register()
    const byName = await api.get('/api/admin/users?q=ays').set(bearer(adminToken))
    assert.equal(byName.body.users.length, 1)
    const byPhone = await api.get('/api/admin/users?q=050 123').set(bearer(adminToken))
    assert.equal(byPhone.body.users.length, 1)
    assert.equal(byPhone.body.users[0].passwordHash, undefined)
  })
})

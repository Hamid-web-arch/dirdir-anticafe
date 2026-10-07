// Testlər üçün müvəqqəti PostgreSQL: hər işə salınmada təmiz baza, sonda silinir.
import { execSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createEmbeddedPg } from '../scripts/embedded-pg.js'

const serverDir = fileURLToPath(new URL('..', import.meta.url))

export async function startTestServer() {
  const databaseDir = join(tmpdir(), `dirdir-pg-test-${process.pid}`)
  rmSync(databaseDir, { recursive: true, force: true })

  const pg = createEmbeddedPg({ databaseDir, port: 5500 + Math.floor(Math.random() * 400) })
  const databaseUrl = await pg.start({ database: 'test' })

  // config.js mühiti import zamanı oxuyur — ona görə app-i bundan sonra import edirik.
  Object.assign(process.env, {
    NODE_ENV: 'test',
    DATABASE_URL: databaseUrl,
    JWT_SECRET: 'test-secret-that-is-definitely-long-enough',
    BCRYPT_ROUNDS: '4',
    RATE_LIMIT_ENABLED: 'false',
  })
  execSync('npx prisma migrate deploy', { cwd: serverDir, env: process.env, stdio: 'pipe' })

  const { createApp } = await import('../src/app.js')
  const { prisma } = await import('../src/db.js')
  const { hashPassword } = await import('../src/auth.js')

  return {
    app: createApp(),
    prisma,
    hashPassword,
    async reset() {
      await prisma.$executeRawUnsafe('TRUNCATE "PointEntry", "PromoCode", "User" CASCADE')
    },
    async stop() {
      await prisma.$disconnect()
      pg.stop()
      rmSync(databaseDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    },
  }
}

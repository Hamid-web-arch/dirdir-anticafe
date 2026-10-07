// Lokal inkişaf üçün PostgreSQL — ayrıca quraşdırma lazım deyil.
// `npm run db:local` işə salır və açıq qalır (Ctrl+C ilə dayandır).
// Məlumatlar server/.pgdata qovluğunda saxlanır.
import { fileURLToPath } from 'node:url'
import { createEmbeddedPg } from './embedded-pg.js'

const pg = createEmbeddedPg({
  databaseDir: fileURLToPath(new URL('../.pgdata', import.meta.url)),
  port: Number(process.env.LOCAL_DB_PORT ?? 5433),
})

const url = await pg.start({ database: 'dirdir' })
console.log(`PostgreSQL işləyir. .env faylında:\nDATABASE_URL="${url}"`)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    pg.stop()
    process.exit(0)
  })
}

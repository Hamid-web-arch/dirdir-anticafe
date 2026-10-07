// embedded-postgres üçün kiçik örtük: UTF-8 baza və düzgün dayandırma.
// Paketin öz stop()-u Windows-da prosesi `taskkill /f` ilə öldürür — işçi proseslər
// yetim qalır və qovluq kilidli olur. Biz isə PostgreSQL-in öz `pg_ctl stop`-unu çağırırıq.
import EmbeddedPostgres from 'embedded-postgres'
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const platformPackage = {
  win32: 'windows',
  darwin: 'darwin',
  linux: 'linux',
}[process.platform]

const { pg_ctl } = await import(`@embedded-postgres/${platformPackage}-${process.arch}`)

export function createEmbeddedPg({ databaseDir, port }) {
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: true,
    // Windows-da sistem kodlaşdırması (məs. WIN1251) "ı", "ə" kimi hərfləri saxlaya bilmir.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => {},
  })

  return {
    async start({ database }) {
      const firstRun = !existsSync(databaseDir)
      if (firstRun) await pg.initialise()
      await pg.start()
      if (firstRun) await pg.createDatabase(database)
      return `postgresql://postgres:postgres@localhost:${port}/${database}`
    },
    stop() {
      execFileSync(pg_ctl, ['stop', '-D', databaseDir, '-m', 'fast', '-w'], { stdio: 'ignore' })
    },
  }
}

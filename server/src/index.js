import { config } from './config.js'
import { createApp } from './app.js'
import { prisma } from './db.js'

const server = createApp().listen(config.PORT, () => {
  console.log(`DırDır API işləyir: http://localhost:${config.PORT}/api/health`)
})

// Hostinq serveri dayandıranda açıq bağlantıları səliqə ilə bağlayırıq.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  })
}

import { z } from 'zod'

// Mühit dəyişənləri bir yerdə yoxlanır — səhv konfiqurasiya ilə server ümumiyyətlə başlamır.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL təyin olunmayıb'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET ən azı 32 simvol olmalıdır'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // Vergüllə ayrılmış icazəli frontend ünvanları
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173,http://localhost:5174')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  // Testlərdə rate limit söndürülür
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
  throw new Error(`Konfiqurasiya xətası:\n${problems}`)
}

export const config = parsed.data

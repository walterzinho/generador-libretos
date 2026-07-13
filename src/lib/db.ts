import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

// Ensure db directory exists
const dbDir = path.join(process.cwd(), 'db')
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}
const dbPath = path.join(dbDir, 'custom.db')

// Use absolute datasourceUrl so it works regardless of WorkingDirectory
// (standalone builds may be launched from different directories)
const datasourceUrl = `file:${dbPath}`

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl,
    log: process.env.NODE_ENV !== 'production' ? ['query'] : [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
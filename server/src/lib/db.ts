import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client in serverless environments
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? 
  new PrismaClient({
    log: ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Graceful shutdown for serverless functions
process.on('beforeExit', async () => {
  await db.$disconnect();
});
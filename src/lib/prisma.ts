import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = new PrismaClient();
  }
  return globalForPrisma.__prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

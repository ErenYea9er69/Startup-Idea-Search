import { PrismaClient } from '@prisma/client';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const prismaClientSingleton = () => {
  console.log("DB URL IS:", process.env.DATABASE_URL);
  const dbUrl = new URL(process.env.DATABASE_URL || 'mariadb://root@localhost:3306/startup_search');
  const adapter = new PrismaMariaDb({
    host: dbUrl.hostname,
    port: Number(dbUrl.port) || 3306,
    user: dbUrl.username,
    password: dbUrl.password || undefined,
    database: dbUrl.pathname.substring(1) || 'startup_search',
  });
  return new PrismaClient({ adapter });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

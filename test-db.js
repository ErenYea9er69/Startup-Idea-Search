
const { PrismaClient } = require('@prisma/client');
const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
const { URL } = require('url');

const DATABASE_URL = "mysql://root:@127.0.0.1:3306/startup_search";

async function testConnection() {
  console.log("Testing connection with URL:", DATABASE_URL);
  try {
    const dbUrl = new URL(DATABASE_URL);
    const adapter = new PrismaMariaDb({
      host: dbUrl.hostname,
      port: Number(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: dbUrl.password || undefined,
      database: dbUrl.pathname.substring(1) || 'startup_search',
    });
    
    console.log("Configuring Prisma with adapter...");
    const prisma = new PrismaClient({ adapter });
    
    console.log("Attempting to connect ($connect)...");
    const start = Date.now();
    await prisma.$connect();
    console.log("Connected successfully in", Date.now() - start, "ms");
    
    console.log("Attempting a simple query (count pipelines)...");
    const count = await prisma.pipelineRun.count();
    console.log("Query successful, count:", count);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error("Connection failed!");
    console.error(error);
    process.exit(1);
  }
}

testConnection();

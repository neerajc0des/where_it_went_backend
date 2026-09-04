// import { PrismaClient } from '../generated/prisma';
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';


const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  ssl: {
    rejectUnauthorized: false, // This bypasses the self-signed cert error
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
// const prisma = new PrismaClient();

export default prisma;
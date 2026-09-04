import prisma from "./config/db";
import 'dotenv/config';

const testConnection = async ()=>{
    try {
    console.log("Waking up database...");
    
    // Run a simple query that doesn't require any tables
    const result = await prisma.$queryRaw`SELECT 1 as status`;
    
    console.log("✅ Database is awake and successfully connected!");
    console.log("Result:", result);
  } catch (error) {
    console.error("❌ Failed to connect to the database:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
import cron from 'node-cron';
import prisma from '../config/db';

export const startDbKeepAlive = () => {
  cron.schedule("0 */6 * * *", async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log("[cron] Aiven DB ping OK");
    } catch (err) {
      console.error("[cron] Aiven DB ping failed:", err);
    }
  });
};

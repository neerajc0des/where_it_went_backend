import cron from 'node-cron';

const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL;
const API_V = process.env.API_VERSION || '/api/v1';

export const startRenderKeepAlive = () => {
  if (!SELF_URL) {
    console.warn("[cron] No RENDER_EXTERNAL_URL / SELF_URL set, skipping Render keep-alive");
    return;
  }
 
  cron.schedule("*/10 * * * *", async () => {
    try {
      const res = await fetch(`${SELF_URL}${API_V}/health`);
      console.log(`[cron] Render ping -> ${res.status}`);
    } catch (err) {
      console.error("[cron] Render ping failed:", err);
    }
  });
};

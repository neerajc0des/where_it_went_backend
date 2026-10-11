import 'dotenv/config';
// import prisma from './config/db';
import app from './app';
import { startDbKeepAlive } from './jobs/aiven_ping';
import { startRenderKeepAlive } from './jobs/render_ping';



const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

startRenderKeepAlive();
startDbKeepAlive();
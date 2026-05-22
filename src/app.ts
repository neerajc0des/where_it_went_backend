import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/v1/auth/', authRoutes);

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
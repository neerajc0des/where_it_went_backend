
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './config/passport';
import passport from 'passport';
import authRoutes from './modules/auth/auth.routes';
import accountRoutes from './modules/accounts/accounts.routes';
import categoryRoutes from './modules/categories/categories.routes';
import transactionRoutes from './modules/transactions/transactions.routes';
import moodRoutes from './modules/mood/mood.routes';

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());



app.use(passport.initialize());


app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/moods', moodRoutes);

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
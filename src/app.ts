
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
import recapRoutes from './modules/recap/recap.routes';
import nudgeRoutes from './modules/nudges/nudge.routes';
import aiRoutes from './modules/ai/ai.route';

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
app.use(express.json());



app.use(passport.initialize());

const apiVersion = process.env.API_VERSION;


app.use(`${apiVersion}/auth`, authRoutes);
app.use(`${apiVersion}/accounts`, accountRoutes);
app.use(`${apiVersion}/categories`, categoryRoutes);
app.use(`${apiVersion}/transactions`, transactionRoutes);
app.use(`${apiVersion}/moods`, moodRoutes);
app.use(`${apiVersion}/recaps`, recapRoutes);
app.use(`${apiVersion}/nudges`, nudgeRoutes);
app.use(`${apiVersion}/nlp`, aiRoutes);

app.get(`${apiVersion}/health`, (_req, res) => {
  res.json({ status: 'ok' });
});

export default app;
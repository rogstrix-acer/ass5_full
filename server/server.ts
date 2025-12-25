import express, { Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'path';
import pdfRoutes from './src/routes/pdfRoutes';

import connectDB from './src/config/database';

dotenv.config();

connectDB();

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/pdf', pdfRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 8000;


app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

import express, { Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());


// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 8000;


app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

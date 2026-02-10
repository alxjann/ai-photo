import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import embed from './routes/embed.js';
import image from './routes/image.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// mdlleware
app.use(cors());
app.use(express.json());

// routes
app.use('/api', embed);
app.use('/api', image);

app.get('/', (req, res) => {
  res.json({ message: 'AI Photo Gallery API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
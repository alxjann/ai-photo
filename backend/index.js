import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import embed from './routes/embed.js';
import image from './routes/image.js';
import search from './routes/search.js'; // ADD THIS LINE

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

// routes
app.use('/api', embed);
app.use('/api', image);
app.use('/api', search); // ADD THIS LINE

app.get('/', (req, res) => {
  res.json({ message: 'AI Photo Gallery API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
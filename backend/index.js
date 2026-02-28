import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import embed from './routes/embed.js';
import image from './routes/image.js';
import search from './routes/search.js';
import people from './routes/people.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.use('/api', embed);
app.use('/api', image);
app.use('/api', search);
app.use('/api', people);

app.get('/', (req, res) => {
  res.json({ message: 'AI Photo Gallery API is running!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
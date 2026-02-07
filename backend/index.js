import 'dotenv/config';
import express from 'express';
import photo from './routes/photo.js'

const app = express();

app.use(express.json());

app.use('/api', photo);

app.listen(3500, () => {
  console.log(`Server running on port ${3500}`);
});
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { cocktailsRouter } from './routes/cocktails';
import { swaggerUi, swaggerSpec } from './swagger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public route
app.use('/api/cocktails', cocktailsRouter);


app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

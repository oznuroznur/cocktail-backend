import express from 'express';
import cors from 'cors';
import { cocktailsRouter } from './routes/cocktails';
import { swaggerUi, swaggerSpec } from './swagger';
import dotenv from 'dotenv';
import { pantryRouter } from './routes/pantry';


dotenv.config();
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <p><a href="/api-docs">API dökümantasyonu</a></p>
      </body>
    </html>
  `);
});

//docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public route
app.use('/api/cocktails', cocktailsRouter);
app.use('/api/pantry', pantryRouter);      


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});

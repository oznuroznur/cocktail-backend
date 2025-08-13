import express from 'express';
import cors from 'cors';
import { cocktailsRouter } from './routes/cocktails';
import { swaggerUi, swaggerSpec } from './swagger';
import dotenv from 'dotenv';


dotenv.config();
const app = express();
app.use(express.json());    
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <body>
        <p><a href="/api-docs">API dökümantasyonu</a></p>
      </body>
    </html>
  `);
});

app.use(cors());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public route
app.use('/api/cocktails', cocktailsRouter);


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});

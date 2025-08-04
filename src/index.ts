import express from 'express';
import cors from 'cors';
import { cocktailsRouter } from './routes/cocktails';
import { swaggerUi, swaggerSpec } from './swagger';
import dotenv from 'dotenv';


dotenv.config();
const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Hoş Geldiniz</title></head>
      <body style="font-family:sans-serif; text-align:center; margin-top:50px;">
        <h1>😊 Hoş geldiniz! 🍹</h1>
        <p>Bu backend sunucusu çalışıyor.</p>
        <p><a href="/api-docs">API dökümantasyonuna gitmek için tıklayın</a></p>
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

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cocktails_1 = require("./routes/cocktails");
const swagger_1 = require("./swagger");
const dotenv_1 = __importDefault(require("dotenv"));
const pantry_1 = require("./routes/pantry");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
app.use('/api-docs', swagger_1.swaggerUi.serve, swagger_1.swaggerUi.setup(swagger_1.swaggerSpec));
// Public route
app.use('/api/cocktails', cocktails_1.cocktailsRouter);
app.use('/api/pantry', pantry_1.pantryRouter);
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
});

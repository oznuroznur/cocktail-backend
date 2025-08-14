import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

dotenv.config();

const swaggerHost = process.env.SWAGGER_HOST || 'http://localhost:8001';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Cocktail API',
      version: '1.0.0',
      description: 'Cocktail backend Swagger docs',
    },
    servers: [
      {
        url: swaggerHost,
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
export { swaggerUi };

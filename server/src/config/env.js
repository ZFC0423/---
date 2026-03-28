import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT || 3000);
const host = process.env.APP_HOST || 'http://localhost';

export const env = {
  port,
  appName: process.env.APP_NAME || 'ganzhou-travel-platform-server',
  appUrl: process.env.APP_URL || `${host}:${port}`,
  dbHost: process.env.DB_HOST || '127.0.0.1',
  dbPort: Number(process.env.DB_PORT || 3306),
  dbName: process.env.DB_NAME || 'ganzhou_travel_platform',
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  jwtSecret: process.env.JWT_SECRET || 'replace-with-your-jwt-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  uploadDir: process.env.UPLOAD_DIR || 'src/uploads',
  uploadUrlPrefix: process.env.UPLOAD_URL_PREFIX || '/uploads',
  aiBaseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1',
  aiApiKey: process.env.AI_API_KEY || '',
  aiModel: process.env.AI_MODEL || 'gpt-4o-mini'
};

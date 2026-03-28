import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import routes from './routes/index.js';
import { uploadStaticPath } from './config/upload.js';
import { sendSuccess } from './utils/response.js';
import { notFoundHandler } from './middlewares/not-found.js';
import { errorHandler } from './middlewares/error-handler.js';

const app = express();
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
]);

const corsOptions = {
  origin(origin, callback) {
    // Allow non-browser or same-origin requests that do not send Origin.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  }
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadStaticPath));

app.get('/health', (req, res) => {
  sendSuccess(res, { status: 'ok' });
});

app.use(routes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;

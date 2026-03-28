import app from './app.js';
import { env } from './config/env.js';
import { ensureUploadDir } from './config/upload.js';
import { connectDatabase } from './config/db.js';

async function bootstrap() {
  try {
    ensureUploadDir();
    await connectDatabase();

    app.listen(env.port, () => {
      console.log(`[server] ${env.appName} is running at ${env.appUrl}`);
    });
  } catch (error) {
    console.error('[server] failed to start:', error.message);
    process.exit(1);
  }
}

bootstrap();

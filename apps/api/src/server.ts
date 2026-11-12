import app from './app';
import { getEnv } from './config/env';
import { disconnectPrisma } from './db';

const env = getEnv();

const server = app.listen(env.PORT, () => {
  console.log(
    `FairCart API listening on :${env.PORT} (${env.NODE_ENV}, DEMO_MODE=${env.DEMO_MODE})`,
  );
});

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down`);

  server.close(async () => {
    await disconnectPrisma();
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

import { createApp } from './app';
import { readConfig } from './config';
import { createDatabase } from './db';

const config = readConfig();
const db = createDatabase(config.DATABASE_URL);
const app = createApp(db, config);
app.addHook('onClose', () => db.destroy());
await app.listen({ port: config.PORT, host: '0.0.0.0' });

import { z } from 'zod';

const environment = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  APP_ORIGIN: z.url(),
  TENANT_ID: z.string().regex(/^[a-z0-9-]+$/).default('doce-afeto'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SHOP_NAME: z.string().default('Doce Afeto'),
  SHOP_PICKUP_ADDRESS: z.string().default(''),
  SHOP_PICKUP_HOURS: z.string().default(''),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().default(''),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().default(''),
  MERCADO_PAGO_COLLECTOR_ID: z.string().default(''),
  MERCADO_PAGO_SANDBOX: z.enum(['true', 'false']).default('true'),
  API_PUBLIC_URL: z.string().default(''),
});
export type Config = z.infer<typeof environment> & { demo: boolean };
export function readConfig(): Config {
  const parsed = environment.safeParse(process.env);
  if (!parsed.success) throw new Error(`Configure estas variáveis na API: ${parsed.error.issues.map(i => i.path.join('.')).join(', ')}`);
  const c = { ...parsed.data, APP_ORIGIN: new URL(parsed.data.APP_ORIGIN).origin, demo: false };
  if (c.NODE_ENV === 'production' && (!c.APP_ORIGIN.startsWith('https://') || c.AUTH_SECRET.includes('gere-um-segredo'))) {
    throw new Error('Produção exige APP_ORIGIN HTTPS e AUTH_SECRET aleatório.');
  }
  return c;
}
export const paymentsEnabled = (c: Config) => !c.demo && !!(c.MERCADO_PAGO_ACCESS_TOKEN && c.MERCADO_PAGO_WEBHOOK_SECRET && c.MERCADO_PAGO_COLLECTOR_ID && c.API_PUBLIC_URL.startsWith('https://') && c.APP_ORIGIN.startsWith('https://'));

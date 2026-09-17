import { z } from 'zod';

export const categories = ['Brigadeiros', 'Brownies', 'Doces no pote', 'Para presentear'] as const;
const imageUrl = z.string().max(1500).refine(value => {
  if (/^\/images\/[a-z0-9_-]+\.(webp|png|jpe?g)$/i.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Use uma URL HTTPS de imagem ou um arquivo /images/.');
export const productSchema = z.object({
  name: z.string().trim().min(2).max(90), description: z.string().trim().min(10).max(800),
  category: z.enum(categories), price_cents: z.number().int().min(1).max(100000),
  stock: z.number().int().min(0).max(10000), image_url: imageUrl,
  unit: z.string().trim().min(2).max(60), allergens: z.array(z.string().trim().min(1).max(40)).max(15),
  featured: z.boolean(), available: z.boolean(),
}).strict();
export const signupSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.email().max(254).transform(s => s.toLowerCase()), password: z.string().min(10).max(128) }).strict();
export const loginSchema = signupSchema.omit({ name: true });
export const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  phone: z.string().transform(s => s.replace(/\D/g, '')).pipe(z.string().regex(/^\d{10,11}$/, 'Informe um telefone com DDD.')),
  notes: z.string().trim().max(500).default(''),
  payment_method: z.enum(['pickup', 'mercadopago']),
  items: z.array(z.object({ product_id: z.uuid(), quantity: z.number().int().min(1).max(50), expected_price_cents: z.number().int().positive() }).strict()).min(1).max(30),
}).strict().refine(p => new Set(p.items.map(i => i.product_id)).size === p.items.length, 'Não repita produtos no pedido.');
export type Checkout = z.infer<typeof checkoutSchema>;
export const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) });

import type { Kysely } from 'kysely';
import type { Database } from './schema';

export async function seedCatalog(db: Kysely<Database>, tenant: string, name = 'Doce Afeto') {
  await db.insertInto('tenants').values({ id: tenant, name }).onConflict(c => c.column('id').doNothing()).execute();
  const items = [
    { name: 'Brigadeiro da casa', description: 'O clássico que abraça. Chocolate, leite condensado e uma generosa camada de granulado.', category: 'Brigadeiros', price_cents: 450, unit: '1 unidade · 25 g', image_url: '/images/brigadeiro.webp', stock: 40, featured: true, allergens: ['Leite', 'Soja'] },
    { name: 'Brownie de chocolate', description: 'Casquinha delicada por fora, intenso e bem molhadinho por dentro. Do jeito que a gente ama.', category: 'Brownies', price_cents: 1200, unit: '1 unidade · 80 g', image_url: '/images/brownie.webp', stock: 16, featured: true, allergens: ['Leite', 'Ovos', 'Trigo', 'Soja'] },
    { name: 'Morango com carinho', description: 'Camadas de creme de leite em pó, bolo fofinho e morangos frescos. Uma colherada de felicidade.', category: 'Doces no pote', price_cents: 1800, unit: '1 pote · 200 ml', image_url: '/images/strawberry.webp', stock: 12, featured: true, allergens: ['Leite', 'Ovos', 'Trigo'] },
    { name: 'Seleção de afetos', description: 'Um presente para dividir: 5 brigadeiros, 2 brownies e morangos. Embalados com todo o nosso carinho.', category: 'Para presentear', price_cents: 4900, unit: '1 seleção · 7 doces', image_url: '/images/hero.webp', stock: 8, featured: false, allergens: ['Leite', 'Ovos', 'Trigo', 'Soja'] },
  ];
  if (await db.selectFrom('products').select('id').where('tenant_id', '=', tenant).executeTakeFirst()) return;
  await db.insertInto('products').values(items.map(p => ({ ...p, id: crypto.randomUUID(), tenant_id: tenant, available: true }))).execute();
}

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const writeHeaders = { 'X-Requested-With': 'DoceAfeto', Origin: 'http://localhost:5173' };
test.beforeAll(async ({ request }) => {
  // Never run destructive test journeys against a real shop.
  expect((await (await request.get('/api/shop')).json()).demo).toBe(true);
  expect((await request.post('/api/auth/login', { headers: writeHeaders, data: { email: 'admin@doceafeto.local', password: 'DoceAfeto!2026' } })).ok()).toBe(true);
  for (const product of await (await request.get('/api/admin/products')).json()) {
    if (product.name.startsWith('Doce E2E ')) expect((await request.delete(`/api/admin/products/${product.id}`, { headers: writeHeaders })).ok()).toBe(true);
  }
});

test('cardápio responsivo e acessível em celular, tablet e desktop', async ({ page }) => {
  const issues: string[] = []; page.on('pageerror', error => issues.push(error.message));
  for (const width of [320, 375, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: width > 900 ? 1000 : 844 });
    await page.goto('/'); await expect(page.getByRole('heading', { name: 'Qual vai adoçar seu dia?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Adicionar Brigadeiro da casa à sacola' })).toBeVisible();
    await expect(page.locator('.product-card')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/menu-${width}.png`, fullPage: true });
    const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(a11y.violations.map(v => ({ id: v.id, description: v.description, nodes: v.nodes.map(n => n.target) }))).toEqual([]);
  }
  expect(issues).toEqual([]);
});

test('busca, filtro, detalhes, sacola persistente e compra sem cadastro', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await page.getByRole('button', { name: 'Brownies', exact: true }).click(); await expect(page.locator('.product-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Todos os doces', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar um doce' }).fill('inexistente'); await expect(page.getByText('Esse docinho ainda não apareceu')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await page.getByRole('button', { name: 'Ver detalhes de Brigadeiro da casa' }).click();
  await expect(page.getByText('Informações de alérgenos')).toBeVisible();
  await page.getByRole('button', { name: 'Adicionar · R$' }).click();
  await page.reload(); await page.getByRole('button', { name: 'Ver minha sacola' }).click();
  await page.getByRole('button', { name: 'Aumentar Brigadeiro da casa' }).click();
  await expect(page.getByRole('dialog').getByText('R$ 9,00', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Continuar pedido' }).click();
  await page.getByRole('button', { name: 'Confirmar pedido de teste' }).click(); await expect(page.getByText('Como podemos chamar você?', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Seu nome' }).fill('Cliente E2E');
  await page.getByRole('textbox', { name: 'Telefone com DDD' }).fill('11988887777');
  await page.getByRole('textbox', { name: 'Algum pedido especial?' }).fill('Pedido de teste, não produzir.');
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); expect(a11y.violations).toEqual([]);
  await page.screenshot({ path: 'test-results/checkout-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Confirmar pedido de teste' }).click();
  await expect(page.getByText('Pedido recebido com carinho!')).toBeVisible();
  await expect(page.getByText('2× Brigadeiro da casa', { exact: true })).toBeVisible();
  await page.reload(); await expect(page.getByText('2× Brigadeiro da casa', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/orders-mobile.png', fullPage: true });
});

test('gestão exige login e permite criar, editar e excluir doce', async ({ page }) => {
  // Independent order fixture; this test also works on its own.
  await page.request.post('/api/auth/guest', { headers: writeHeaders });
  const [product] = await (await page.request.get('/api/products')).json();
  expect((await page.request.post('/api/orders', { headers: { ...writeHeaders, 'Idempotency-Key': crypto.randomUUID() }, data: { customer_name: 'Gestão E2E', phone: '11988887777', notes: 'Teste automatizado', payment_method: 'pickup', items: [{ product_id: product.id, quantity: 1, expected_price_cents: product.price_cents }] } })).status()).toBe(201);
  await page.request.post('/api/auth/logout', { headers: writeHeaders });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto('/gestao');
  await expect(page.getByRole('heading', { name: 'O cantinho de quem faz' })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar na gestão' }).click();
  await page.getByRole('textbox', { name: 'E-mail', exact: true }).fill('admin@doceafeto.local');
  await page.getByLabel('Senha', { exact: true }).fill('DoceAfeto!2026');
  await page.getByRole('dialog').getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seu cantinho de gestão' })).toBeVisible();
  const name = `Doce E2E ${Date.now()}`;
  await page.getByRole('button', { name: 'Novo doce' }).click();
  await page.getByRole('textbox', { name: 'Nome do doce' }).fill(name);
  await page.getByRole('textbox', { name: 'Descrição', exact: true }).fill('Um doce para verificar o cadastro.');
  await page.getByRole('textbox', { name: 'Preço (R$)' }).fill('8,50');
  await page.getByRole('button', { name: 'Salvar doce' }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Editar ${name}`, exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome do doce' }).fill(`${name} editado`);
  await page.getByRole('button', { name: 'Salvar doce' }).click();
  await expect(page.getByRole('heading', { name: `${name} editado`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Excluir ${name} editado`, exact: true }).click();
  await page.getByRole('button', { name: 'Excluir do cardápio', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: `${name} editado`, exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/admin-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Pedidos', exact: true }).click();
  const order = page.locator('.order-card').filter({ hasText: 'Gestão E2E' }).first();
  await expect(order).toBeVisible();
  await order.getByRole('button', { name: 'Começar preparo' }).click();
  await expect(order.getByRole('button', { name: 'Pronto para retirar', exact: true })).toBeVisible();
  await order.getByRole('button', { name: 'Cancelar pedido', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click();
  await expect(order.getByText('Cancelado', { exact: true })).toBeVisible();
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); expect(a11y.violations).toEqual([]);
});

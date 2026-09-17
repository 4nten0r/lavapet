import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<any>) {
  const ddl = `
    create table tenants (id text primary key, name text not null, created_at timestamptz not null default now());
    create table users (
      id uuid primary key, tenant_id text not null references tenants(id), name text not null,
      email text, password_hash text, role text not null default 'customer' check (role in ('admin','customer')),
      created_at timestamptz not null default now(), unique (tenant_id, email), unique (tenant_id, id)
    );
    create table sessions (
      id uuid primary key, tenant_id text not null, user_id uuid not null unique, refresh_hash text not null unique,
      expires_at timestamptz not null, foreign key (tenant_id,user_id) references users(tenant_id,id) on delete cascade
    );
    create table products (
      id uuid primary key, tenant_id text not null references tenants(id), name text not null,
      description text not null, category text not null,
      price_cents integer not null check (price_cents > 0 and price_cents <= 100000),
      stock integer not null check (stock >= 0 and stock <= 10000), image_url text not null,
      unit text not null, allergens text[] not null default '{}', featured boolean not null default false,
      available boolean not null default true, version integer not null default 1,
      deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      unique (tenant_id,id)
    );
    create index products_catalog on products (tenant_id,category) where deleted_at is null;
    create table orders (
      id uuid primary key, tenant_id text not null, customer_id uuid not null, code text not null,
      customer_name text not null, phone text not null, notes text not null, total_cents integer not null check (total_cents > 0),
      status text not null check (status in ('received','preparing','ready','completed','cancelled')),
      payment_method text not null check (payment_method in ('pickup','mercadopago')),
      payment_status text not null check (payment_status in ('pending','paid','refunded','review')),
      idempotency_key uuid not null, request_hash text not null, checkout_url text, payment_id text,
      payment_updated_at timestamptz, stock_released boolean not null default false,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      foreign key (tenant_id,customer_id) references users(tenant_id,id),
      unique (tenant_id,customer_id,idempotency_key), unique (tenant_id,code), unique (tenant_id,id)
    );
    create index orders_customer_history on orders (tenant_id,customer_id,created_at desc);
    create index orders_admin_history on orders (tenant_id,created_at desc);
    create table order_items (
      id uuid primary key, tenant_id text not null, order_id uuid not null, product_id uuid not null,
      name text not null, image_url text not null, unit text not null,
      price_cents integer not null check (price_cents > 0), quantity integer not null check (quantity between 1 and 50),
      foreign key (tenant_id,order_id) references orders(tenant_id,id),
      foreign key (tenant_id,product_id) references products(tenant_id,id), unique (order_id,product_id)
    );
    create index order_items_order on order_items (tenant_id,order_id);
    create table rate_limits (key text primary key, hits integer not null, expires_at timestamptz not null);
    create index rate_limits_expiry on rate_limits(expires_at);
    create index sessions_expiry on sessions(expires_at);
  `;
  for (const statement of ddl.split(';').filter(s => s.trim())) await sql.raw(statement).execute(db);
}
export async function down(db: Kysely<any>) {
  for (const table of ['rate_limits', 'order_items', 'orders', 'products', 'sessions', 'users', 'tenants']) await db.schema.dropTable(table).execute();
}

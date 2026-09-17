import type { ColumnType, Generated, Selectable } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
export interface Database {
  tenants: { id: string; name: string; created_at: Timestamp };
  users: {
    id: string; tenant_id: string; name: string; email: string | null;
    password_hash: string | null; role: 'admin' | 'customer'; created_at: Timestamp;
  };
  sessions: { id: string; tenant_id: string; user_id: string; refresh_hash: string; expires_at: Timestamp };
  products: {
    id: string; tenant_id: string; name: string; description: string; category: string;
    price_cents: number; stock: number; image_url: string; unit: string; allergens: string[];
    featured: boolean; available: boolean; version: Generated<number>;
    deleted_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
    created_at: Timestamp; updated_at: Timestamp;
  };
  orders: {
    id: string; tenant_id: string; customer_id: string; code: string;
    customer_name: string; phone: string; notes: string; total_cents: number;
    status: OrderStatus; payment_method: 'pickup' | 'mercadopago'; payment_status: PaymentStatus;
    idempotency_key: string; request_hash: string; checkout_url: string | null;
    payment_id: string | null; payment_updated_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
    stock_released: Generated<boolean>; created_at: Timestamp; updated_at: Timestamp;
  };
  order_items: {
    id: string; tenant_id: string; order_id: string; product_id: string;
    name: string; image_url: string; unit: string; price_cents: number; quantity: number;
  };
  rate_limits: { key: string; hits: number; expires_at: Timestamp };
}
export type Product = Selectable<Database['products']>;
export type Order = Selectable<Database['orders']>;
export type User = Selectable<Database['users']>;
export type OrderStatus = 'received' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'review';

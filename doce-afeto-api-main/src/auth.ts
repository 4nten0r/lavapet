import { createHash, randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SignJWT, jwtVerify } from 'jose';
import { sql, type Kysely, type Transaction } from 'kysely';
import type { Config } from './config';
import type { Database, User } from './schema';
import { AppError } from './errors';

type Db = Kysely<Database> | Transaction<Database>;
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const publicUser = (u: User) => ({ id: u.id, name: u.name, email: u.email, role: u.role, guest: !u.email });
export const hashPassword = (value: string) => Bun.password.hash(value, { algorithm: 'argon2id', memoryCost: 65536, timeCost: 3 });

export class Auth {
  private key: Uint8Array;
  constructor(private db: Kysely<Database>, private config: Config) { this.key = new TextEncoder().encode(config.AUTH_SECRET); }
  private cookieOptions(maxAge: number) {
    return { httpOnly: true, secure: this.config.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api', maxAge };
  }
  async issue(db: Db, user: User, reply: FastifyReply) {
    const sessionId = crypto.randomUUID();
    const refresh = randomBytes(32).toString('hex');
    // ON CONFLICT makes simultaneous logins leave exactly one active session.
    await db.insertInto('sessions').values({
      id: sessionId, user_id: user.id, tenant_id: user.tenant_id, refresh_hash: hash(refresh), expires_at: new Date(Date.now() + 30 * 864e5),
    }).onConflict(c => c.column('user_id').doUpdateSet({ id: sessionId, refresh_hash: hash(refresh), expires_at: new Date(Date.now() + 30 * 864e5) })).execute();
    await this.setCookies(sessionId, user, refresh, reply);
  }
  private async setCookies(sid: string, user: User, refresh: string, reply: FastifyReply) {
    const token = await new SignJWT({ tenant_id: user.tenant_id, sid }).setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id).setIssuer('doce-afeto-api').setAudience('doce-afeto-web').setIssuedAt().setExpirationTime('15m').sign(this.key);
    reply.setCookie('da_access', token, this.cookieOptions(15 * 60));
    reply.setCookie('da_refresh', refresh, this.cookieOptions(30 * 86400));
  }
  async current(request: FastifyRequest): Promise<User | null> {
    const token = request.cookies.da_access;
    if (!token) {
      if (request.cookies.da_refresh) throw new AppError(401, 'Sua sessão precisa ser renovada.', 'SESSION_EXPIRED');
      return null;
    }
    let payload;
    try { ({ payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'], issuer: 'doce-afeto-api', audience: 'doce-afeto-web' })); }
    catch { throw new AppError(401, 'Sua sessão expirou.', 'SESSION_EXPIRED'); }
    if (payload.tenant_id !== this.config.TENANT_ID || !payload.sub || typeof payload.sid !== 'string') throw new AppError(401, 'Sessão inválida.');
    // Role comes from the DB, so revocation takes effect immediately.
    const user = await this.db.selectFrom('users').innerJoin('sessions', 'sessions.user_id', 'users.id')
      .selectAll('users').where('sessions.id', '=', payload.sid).where('users.id', '=', payload.sub)
      .where('users.tenant_id', '=', this.config.TENANT_ID).where('sessions.tenant_id', '=', this.config.TENANT_ID)
      .where('sessions.expires_at', '>', new Date()).executeTakeFirst();
    if (!user) throw new AppError(401, 'Entre novamente para continuar.', 'SESSION_EXPIRED');
    return user;
  }
  async require(request: FastifyRequest, role?: 'admin') {
    const user = await this.current(request);
    if (!user) throw new AppError(401, 'Entre para continuar.');
    if (role && user.role !== role) throw new AppError(403, 'Esta área é exclusiva da administração.');
    return user;
  }
  async refresh(request: FastifyRequest, reply: FastifyReply) {
    const raw = request.cookies.da_refresh;
    if (!raw) throw new AppError(401, 'Entre novamente.');
    await this.db.transaction().execute(async tx => {
      const session = await tx.selectFrom('sessions').selectAll().where('refresh_hash', '=', hash(raw))
        .where('tenant_id', '=', this.config.TENANT_ID).where('expires_at', '>', new Date()).forUpdate().executeTakeFirst();
      if (!session) throw new AppError(401, 'Sua sessão expirou. Entre novamente.');
      const user = await tx.selectFrom('users').selectAll().where('id', '=', session.user_id).where('tenant_id', '=', this.config.TENANT_ID).executeTakeFirstOrThrow();
      const next = randomBytes(32).toString('hex');
      await tx.updateTable('sessions').set({ refresh_hash: hash(next) }).where('id', '=', session.id).execute();
      await this.setCookies(session.id, user, next, reply);
    });
  }
  async logout(request: FastifyRequest, reply: FastifyReply) {
    if (request.cookies.da_refresh) await this.db.deleteFrom('sessions').where('tenant_id', '=', this.config.TENANT_ID).where('refresh_hash', '=', hash(request.cookies.da_refresh)).execute();
    reply.clearCookie('da_access', { path: '/api' }); reply.clearCookie('da_refresh', { path: '/api' });
  }
}

// Persistent counters work across serverless instances; raw IPs are not stored.
export async function rateLimit(db: Kysely<Database>, key: string, max: number, windowSeconds: number) {
  const result = await sql<{ hits: number }>`
    insert into rate_limits (key,hits,expires_at) values (${hash(key)},1,now()+${windowSeconds}*interval '1 second')
    on conflict (key) do update set
      hits = case when rate_limits.expires_at <= now() then 1 else rate_limits.hits+1 end,
      expires_at = case when rate_limits.expires_at <= now() then now()+${windowSeconds}*interval '1 second' else rate_limits.expires_at end
    returning hits
  `.execute(db);
  if (result.rows[0].hits > max) throw new AppError(429, 'Muitas tentativas. Aguarde alguns minutos e tente novamente.', 'RATE_LIMITED');
}

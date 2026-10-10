import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import type { APIContext } from 'astro';
import { db } from './db';

config({ path: resolve(process.cwd(), '.env'), override: true });

const sessionCookie = 'blog_session';
const csrfCookie = 'blog_csrf';
const sessionLifetimeSeconds = 60 * 60 * 8;

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const passwordMatches = (password: string) => {
	const expected = process.env.ADMIN_PASSWORD_HASH;
	const configuredPassword = process.env.ADMIN_PASSWORD;
	if (!expected) return Boolean(configuredPassword && password === configuredPassword);
	const [salt, digest] = expected.split('$');
	if (!salt || !digest) return false;
	const actual = scryptSync(password, salt, 64).toString('hex');
	if (actual.length !== digest.length) return false;
	return timingSafeEqual(Buffer.from(actual), Buffer.from(digest));
};

export const getSession = (context: APIContext) => {
	const token = context.cookies.get(sessionCookie)?.value;
	if (!token) return null;
	const session = db.prepare('SELECT token_hash, csrf_token, expires_at FROM sessions WHERE token_hash = ? AND expires_at > ?').get(hash(token), Date.now()) as { token_hash: string; csrf_token: string; expires_at: number } | undefined;
	return session ? { token, ...session } : null;
};

export const authenticate = (password: string) => passwordMatches(password);

export const syncCsrfCookie = (context: APIContext, csrfToken: string) => {
	const secure = import.meta.env.PROD;
	context.cookies.set(csrfCookie, csrfToken, { httpOnly: false, sameSite: 'lax', secure, path: '/', maxAge: sessionLifetimeSeconds });
};

const loginWindowMs = 15 * 60 * 1000;
const maxFailedAttempts = 5;

export const loginAllowed = (key: string) => {
	const now = Date.now();
	const attempt = db.prepare('SELECT failed_count, window_started_at, blocked_until FROM login_attempts WHERE key = ?').get(key) as { failed_count: number; window_started_at: number; blocked_until: number } | undefined;
	if (!attempt) return true;
	if (attempt.blocked_until > now) return false;
	if (now - attempt.window_started_at > loginWindowMs) {
		db.prepare('DELETE FROM login_attempts WHERE key = ?').run(key);
	}
	return true;
};

export const recordLoginAttempt = (key: string, success: boolean) => {
	const now = Date.now();
	if (success) {
		db.prepare('DELETE FROM login_attempts WHERE key = ?').run(key);
		return;
	}
	const current = db.prepare('SELECT failed_count, window_started_at FROM login_attempts WHERE key = ?').get(key) as { failed_count: number; window_started_at: number } | undefined;
	const withinWindow = current && now - current.window_started_at <= loginWindowMs;
	const failedCount = withinWindow ? current.failed_count + 1 : 1;
	db.prepare(`INSERT INTO login_attempts (key, failed_count, window_started_at, blocked_until) VALUES (?, ?, ?, ?)
		ON CONFLICT(key) DO UPDATE SET failed_count = excluded.failed_count, window_started_at = excluded.window_started_at, blocked_until = excluded.blocked_until`)
		.run(key, failedCount, withinWindow ? current.window_started_at : now, failedCount >= maxFailedAttempts ? now + loginWindowMs : 0);
};

export const recordAuthEvent = (event: string, ip = '') => {
	db.prepare('INSERT INTO auth_events (event, ip) VALUES (?, ?)').run(event, ip);
};

export const createSession = (context: APIContext) => {
	const token = randomBytes(32).toString('base64url');
	const csrfToken = randomBytes(24).toString('base64url');
	const expiresAt = Date.now() + sessionLifetimeSeconds * 1000;
	db.prepare('INSERT INTO sessions (token_hash, csrf_token, expires_at) VALUES (?, ?, ?)').run(hash(token), csrfToken, expiresAt);
	const secure = import.meta.env.PROD;
	context.cookies.set(sessionCookie, token, { httpOnly: true, sameSite: 'lax', secure, path: '/', maxAge: sessionLifetimeSeconds });
	syncCsrfCookie(context, csrfToken);
	return { expiresAt };
};

export const destroySession = (context: APIContext) => {
	const session = getSession(context);
	if (session) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(session.token));
	context.cookies.delete(sessionCookie, { path: '/' });
	context.cookies.delete(csrfCookie, { path: '/' });
};

export const hasValidCsrf = (context: APIContext, session: NonNullable<ReturnType<typeof getSession>>) => {
	const header = context.request.headers.get('x-csrf-token');
	const cookie = context.cookies.get(csrfCookie)?.value;
	return Boolean(header && cookie && header === cookie && header === session.csrf_token);
};

import type { APIContext, APIRoute } from 'astro';
import { getSession, hasValidCsrf } from './auth';

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export const readJson = async <T>(request: Request) => {
	try {
		return await request.json() as T;
	} catch {
		throw new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: { 'content-type': 'application/json' } });
	}
};

export const requireSession = (context: APIContext, mutation = false) => {
	const session = getSession(context);
	if (!session) return { response: json({ error: 'authentication_required' }, 401) } as const;
	if (mutation && !hasValidCsrf(context, session)) return { response: json({ error: 'csrf_validation_failed' }, 403) } as const;
	return { session } as const;
};

export const route = (handler: APIRoute): APIRoute => async (context) => {
	try {
		return await handler(context);
	} catch (error) {
		console.error(error);
		return json({ error: 'internal_server_error' }, 500);
	}
};

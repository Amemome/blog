import { authenticate, createSession, loginAllowed, recordAuthEvent, recordLoginAttempt } from '../../../lib/server/auth';
import { json, readJson, route } from '../../../lib/server/http';

type LoginBody = { password?: string };

export const POST = route(async (context) => {
	const ip = context.clientAddress ?? context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
	if (!loginAllowed(ip || 'unknown')) return json({ error: 'too_many_attempts' }, 429);
	const body = await readJson<LoginBody>(context.request);
	if (!body.password || !authenticate(body.password)) {
		recordLoginAttempt(ip || 'unknown', false);
		recordAuthEvent('login_failed', ip);
		return json({ error: 'invalid_credentials' }, 401);
	}
	recordLoginAttempt(ip || 'unknown', true);
	recordAuthEvent('login_succeeded', ip);
	const session = createSession(context);
	return json({ authenticated: true, expiresAt: session.expiresAt });
});

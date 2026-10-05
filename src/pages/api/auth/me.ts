import { getSession } from '../../../lib/server/auth';
import { json, route } from '../../../lib/server/http';

export const GET = route(async (context) => {
	const session = getSession(context);
	return json({ authenticated: Boolean(session), expiresAt: session?.expires_at ?? null });
});

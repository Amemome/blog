import { destroySession, getSession, recordAuthEvent, hasValidCsrf } from '../../../lib/server/auth';
import { json, route } from '../../../lib/server/http';

export const POST = route(async (context) => {
	const session = getSession(context);
	if (session && !hasValidCsrf(context, session)) return json({ error: 'csrf_validation_failed' }, 403);
	if (session) recordAuthEvent('logout', context.clientAddress ?? '');
	destroySession(context);
	return json({ authenticated: false });
});

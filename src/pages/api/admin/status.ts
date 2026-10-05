import { db } from '../../../lib/server/db';
import { json, requireSession, route } from '../../../lib/server/http';

export const GET = route(async (context) => {
	const auth = requireSession(context);
	if ('response' in auth) return auth.response;
	const counts = db.prepare('SELECT status, COUNT(*) AS count FROM posts GROUP BY status').all();
	const lastPublish = db.prepare("SELECT created_at FROM auth_events WHERE event = 'publish' ORDER BY id DESC LIMIT 1").get() as { created_at: string } | undefined;
	return json({ counts, lastPublishAt: lastPublish?.created_at ?? null, generatedAt: new Date().toISOString() });
});
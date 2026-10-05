import { db } from '../../../lib/server/db';
import { json, requireSession, route } from '../../../lib/server/http';

export const GET = route(async (context) => {
	const auth = requireSession(context);
	if ('response' in auth) return auth.response;
	return json({ exportedAt: new Date().toISOString(), categories: db.prepare('SELECT * FROM categories').all(), posts: db.prepare('SELECT * FROM posts').all(), revisions: db.prepare('SELECT * FROM post_revisions').all() });
});
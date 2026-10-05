import { db } from '../../../lib/server/db';
import { json, readJson, requireSession, route } from '../../../lib/server/http';

type CategoryInput = { name?: string; slug?: string; accent?: string };

export const GET = route(async () => {
	const categories = db.prepare('SELECT id, name, slug, accent, created_at, updated_at FROM categories ORDER BY name').all();
	return json({ categories });
});

export const POST = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const body = await readJson<CategoryInput>(context.request);
	if (!body.name?.trim() || !body.slug?.trim()) return json({ error: 'name_slug_required' }, 400);
	try {
		const result = db.prepare('INSERT INTO categories (name, slug, accent) VALUES (?, ?, ?)').run(body.name.trim(), body.slug.trim(), body.accent ?? 'violet');
		return json({ id: result.lastInsertRowid }, 201);
	} catch {
		return json({ error: 'category_conflict' }, 409);
	}
});

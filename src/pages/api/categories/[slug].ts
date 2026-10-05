import { db } from '../../../lib/server/db';
import { json, readJson, requireSession, route } from '../../../lib/server/http';

type CategoryInput = { name?: string; slug?: string; accent?: string };

export const PUT = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const body = await readJson<CategoryInput>(context.request);
	if (!body.name?.trim() || !body.slug?.trim()) return json({ error: 'name_slug_required' }, 400);
	const result = db.transaction(() => {
		const updated = db.prepare('UPDATE categories SET name = ?, slug = ?, accent = ?, updated_at = ? WHERE slug = ?').run(body.name.trim(), body.slug.trim(), body.accent ?? 'violet', new Date().toISOString(), context.params.slug);
		if (updated.changes && context.params.slug !== body.slug) db.prepare('UPDATE posts SET category_slug = ? WHERE category_slug = ?').run(body.slug.trim(), context.params.slug);
		return updated;
	})();
	if (!result.changes) return json({ error: 'not_found' }, 404);
	return json({ updated: true });
});

export const DELETE = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const inUse = db.prepare('SELECT COUNT(*) AS count FROM posts WHERE category_slug = ? AND status != \'deleted\'').get(context.params.slug) as { count: number };
	if (inUse.count > 0) return json({ error: 'category_in_use' }, 409);
	const result = db.prepare('DELETE FROM categories WHERE slug = ?').run(context.params.slug);
	if (!result.changes) return json({ error: 'not_found' }, 404);
	return json({ deleted: true });
});

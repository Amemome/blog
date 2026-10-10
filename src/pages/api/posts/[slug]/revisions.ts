import { db, serializePost, type PostRecord } from '../../../../lib/server/db';
import { json, readJson, requireSession, route } from '../../../../lib/server/http';

export const GET = route(async (context) => {
	const auth = requireSession(context);
	if ('response' in auth) return auth.response;
	const post = db.prepare('SELECT id FROM posts WHERE slug = ?').get(context.params.slug) as { id: number } | undefined;
	if (!post) return json({ error: 'not_found' }, 404);
	const revisions = db.prepare('SELECT id, snapshot, created_at FROM post_revisions WHERE post_id = ? ORDER BY created_at DESC').all(post.id) as { id: number; snapshot: string; created_at: string }[];
	return json({ revisions: revisions.map((revision) => ({ id: revision.id, createdAt: revision.created_at, post: JSON.parse(revision.snapshot) })) });
});

export const POST = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const post = db.prepare('SELECT * FROM posts WHERE slug = ?').get(context.params.slug) as PostRecord | undefined;
	if (!post) return json({ error: 'not_found' }, 404);
	const body = await readJson<{ revisionId?: number }>(context.request);
	if (!body.revisionId) return json({ error: 'revision_required' }, 400);
	const revision = db.prepare('SELECT snapshot FROM post_revisions WHERE id = ? AND post_id = ?').get(body.revisionId, post.id) as { snapshot: string } | undefined;
	if (!revision) return json({ error: 'revision_not_found' }, 404);
	const snapshot = JSON.parse(revision.snapshot) as ReturnType<typeof serializePost>;
	db.transaction(() => {
		db.prepare('INSERT INTO post_revisions (post_id, snapshot) VALUES (?, ?)').run(post.id, JSON.stringify(serializePost(post)));
		db.prepare(`UPDATE posts SET title = ?, slug = ?, excerpt = ?, body = ?, category_slug = ?, tags = ?, cover_url = ?, social_title = ?, social_description = ?, status = ?, published_at = ?, updated_at = ? WHERE id = ?`).run(snapshot.title, snapshot.slug, snapshot.excerpt, snapshot.body ?? snapshot.content.join('\n\n'), snapshot.category_slug ?? snapshot.category, JSON.stringify(snapshot.tags), snapshot.cover_url ?? null, snapshot.social_title ?? null, snapshot.social_description ?? null, snapshot.status, snapshot.published_at ?? null, new Date().toISOString(), post.id);
	})();
	return json({ restored: true });
});
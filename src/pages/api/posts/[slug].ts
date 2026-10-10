import { db, serializePost, type PostRecord, type PostStatus } from '../../../lib/server/db';
import { json, readJson, requireSession, route } from '../../../lib/server/http';
import { recordAuthEvent } from '../../../lib/server/auth';

type PostInput = { title?: string; slug?: string; excerpt?: string; body?: string; category?: string; tags?: string[]; status?: PostStatus; publishedAt?: string | null; coverUrl?: string | null; socialTitle?: string | null; socialDescription?: string | null };
const validStatuses = new Set<PostStatus>(['draft', 'published', 'unpublished', 'deleted']);

export const GET = route(async (context) => {
	const slug = context.params.slug;
	const row = db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug) as PostRecord | undefined;
	const session = requireSession(context);
	const canReadPrivate = 'session' in session && Boolean(session.session);
	if (!row || (row.status !== 'published' && !canReadPrivate)) return json({ error: 'not_found' }, 404);
	return json({ post: serializePost(row) });
});

export const PUT = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const currentSlug = context.params.slug;
	const current = db.prepare('SELECT * FROM posts WHERE slug = ?').get(currentSlug) as PostRecord | undefined;
	if (!current) return json({ error: 'not_found' }, 404);
	const body = await readJson<PostInput>(context.request);
	if (body.status && !validStatuses.has(body.status)) return json({ error: 'invalid_status' }, 400);
	const nextSlug = body.slug?.trim() || current.slug;
	const nextStatus = body.status ?? current.status;
	const now = new Date().toISOString();
	const snapshot = JSON.stringify(serializePost(current));
	try {
		db.transaction(() => {
			db.prepare(`UPDATE posts SET title = ?, slug = ?, excerpt = ?, body = ?, category_slug = ?, tags = ?, cover_url = ?, social_title = ?, social_description = ?, status = ?, published_at = ?, updated_at = ? WHERE id = ?`).run(
				body.title?.trim() || current.title,
				nextSlug,
				body.excerpt?.trim() ?? current.excerpt,
				body.body ?? current.body,
				body.category ?? current.category_slug,
				JSON.stringify(body.tags ?? JSON.parse(current.tags)),
				body.coverUrl ?? current.cover_url,
				body.socialTitle?.trim() ?? current.social_title,
				body.socialDescription?.trim() ?? current.social_description,
				nextStatus,
				nextStatus === 'published' ? body.publishedAt ?? current.published_at ?? now : null,
				now,
				current.id,
			);
			db.prepare('INSERT INTO post_revisions (post_id, snapshot) VALUES (?, ?)').run(current.id, snapshot);
		})();
		if (nextStatus === 'published' && current.status !== 'published') recordAuthEvent('publish', context.clientAddress ?? '');
		return json({ updated: true });
	} catch {
		return json({ error: 'post_slug_or_category_conflict' }, 409);
	}
});

export const DELETE = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const result = db.prepare("UPDATE posts SET status = 'deleted', updated_at = ? WHERE slug = ?").run(new Date().toISOString(), context.params.slug);
	if (!result.changes) return json({ error: 'not_found' }, 404);
	return json({ deleted: true });
});

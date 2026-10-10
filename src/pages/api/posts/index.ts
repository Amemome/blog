import { db, serializePost, type PostRecord, type PostStatus } from '../../../lib/server/db';
import { json, readJson, requireSession, route } from '../../../lib/server/http';
import { recordAuthEvent } from '../../../lib/server/auth';

type PostInput = { title?: string; slug?: string; excerpt?: string; body?: string; category?: string; tags?: string[]; status?: PostStatus; publishedAt?: string | null; coverUrl?: string | null; socialTitle?: string | null; socialDescription?: string | null };
const validStatuses = new Set<PostStatus>(['draft', 'published', 'unpublished', 'deleted']);

export const GET = route(async (context) => {
	const session = requireSession(context);
	const includeDrafts = Boolean(session.session && context.url.searchParams.get('includeDrafts') === 'true');
	const rows = (includeDrafts ? db.prepare('SELECT * FROM posts ORDER BY COALESCE(published_at, updated_at) DESC').all() : db.prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC").all()) as PostRecord[];
	return json({ posts: rows.map(serializePost) });
});

export const POST = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const body = await readJson<PostInput>(context.request);
	if (!body.title?.trim() || !body.slug?.trim() || !body.category?.trim()) return json({ error: 'title_slug_category_required' }, 400);
	const status = body.status ?? 'draft';
	if (!validStatuses.has(status)) return json({ error: 'invalid_status' }, 400);
	const now = new Date().toISOString();
	try {
		const result = db.prepare(`INSERT INTO posts (title, slug, excerpt, body, category_slug, tags, cover_url, social_title, social_description, status, published_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
			.run(body.title.trim(), body.slug.trim(), body.excerpt?.trim() ?? '', body.body ?? '', body.category.trim(), JSON.stringify(body.tags ?? []), body.coverUrl ?? null, body.socialTitle?.trim() || null, body.socialDescription?.trim() || null, status, status === 'published' ? body.publishedAt ?? now : null, now);
		if (status === 'published') recordAuthEvent('publish', context.clientAddress ?? '');
		return json({ id: result.lastInsertRowid }, 201);
	} catch {
		return json({ error: 'post_slug_or_category_conflict' }, 409);
	}
});

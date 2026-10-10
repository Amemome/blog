import { db, serializeNote, type NoteRecord, type NoteStatus } from '../../../lib/server/db';
import { recordAuthEvent } from '../../../lib/server/auth';
import { json, readJson, requireSession, route } from '../../../lib/server/http';

type NoteInput = { body?: string; status?: NoteStatus };
const validStatuses = new Set<NoteStatus>(['draft', 'published', 'unpublished', 'deleted']);

export const GET = route(async (context) => {
	const auth = requireSession(context);
	const includePrivate = 'session' in auth && context.url.searchParams.get('includeDrafts') === 'true';
	const rows = (includePrivate ? db.prepare('SELECT * FROM notes ORDER BY created_at DESC, id DESC').all() : db.prepare("SELECT * FROM notes WHERE status = 'published' ORDER BY created_at DESC, id DESC").all()) as NoteRecord[];
	return json({ notes: rows.map(serializeNote) });
});

export const POST = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const body = await readJson<NoteInput>(context.request);
	const text = body.body?.trim() ?? '';
	const status = body.status ?? 'draft';
	if (!text) return json({ error: 'body_required' }, 400);
	if (text.length > 2000) return json({ error: 'body_too_long' }, 400);
	if (!validStatuses.has(status)) return json({ error: 'invalid_status' }, 400);
	const now = new Date().toISOString();
	const result = db.prepare('INSERT INTO notes (body, status, created_at, updated_at) VALUES (?, ?, ?, ?)').run(text, status, now, now);
	if (status === 'published') recordAuthEvent('note_publish', context.clientAddress ?? '');
	return json({ id: result.lastInsertRowid }, 201);
});

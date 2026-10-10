import { db, serializeNote, type NoteRecord, type NoteStatus } from '../../../lib/server/db';
import { recordAuthEvent } from '../../../lib/server/auth';
import { json, readJson, requireSession, route } from '../../../lib/server/http';

type NoteInput = { body?: string; status?: NoteStatus };
const validStatuses = new Set<NoteStatus>(['draft', 'published', 'unpublished', 'deleted']);

export const GET = route(async (context) => {
	const id = Number(context.params.id);
	if (!Number.isInteger(id)) return json({ error: 'not_found' }, 404);
	const row = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRecord | undefined;
	const auth = requireSession(context);
	if (!row || (row.status !== 'published' && !('session' in auth))) return json({ error: 'not_found' }, 404);
	return json({ note: serializeNote(row) });
});

export const PUT = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const id = Number(context.params.id);
	if (!Number.isInteger(id)) return json({ error: 'not_found' }, 404);
	const current = db.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRecord | undefined;
	if (!current) return json({ error: 'not_found' }, 404);
	const body = await readJson<NoteInput>(context.request);
	const text = body.body?.trim() ?? current.body;
	const status = body.status ?? current.status;
	if (!text) return json({ error: 'body_required' }, 400);
	if (text.length > 2000) return json({ error: 'body_too_long' }, 400);
	if (!validStatuses.has(status)) return json({ error: 'invalid_status' }, 400);
	db.prepare('UPDATE notes SET body = ?, status = ?, updated_at = ? WHERE id = ?').run(text, status, new Date().toISOString(), id);
	if (status === 'published' && current.status !== 'published') recordAuthEvent('note_publish', context.clientAddress ?? '');
	return json({ updated: true });
});

export const DELETE = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const id = Number(context.params.id);
	if (!Number.isInteger(id)) return json({ error: 'not_found' }, 404);
	const result = db.prepare('DELETE FROM notes WHERE id = ?').run(id);
	if (!result.changes) return json({ error: 'not_found' }, 404);
	recordAuthEvent('note_delete', context.clientAddress ?? '');
	return json({ deleted: true });
});

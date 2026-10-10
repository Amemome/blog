import { db, serializeNote, type NoteRecord } from './db';
import { renderMarkdown } from './markdown';

export const getPublishedNotes = () => {
	const records = db.prepare("SELECT * FROM notes WHERE status = 'published' ORDER BY created_at DESC, id DESC").all() as NoteRecord[];
	return records.map((note) => ({ ...serializeNote(note), html: renderMarkdown(note.body) }));
};
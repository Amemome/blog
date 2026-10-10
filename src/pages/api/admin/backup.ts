import { cp } from 'node:fs/promises';
import path from 'node:path';
import { db } from '../../../lib/server/db';
import { json, requireSession, route } from '../../../lib/server/http';
import { backupDirectory, ensureStorageDirectories, mediaDirectory } from '../../../lib/server/storage';

export const POST = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	await ensureStorageDirectories();
	const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
	const destination = path.join(backupDirectory, `blog-${stamp}.sqlite`);
	const mediaDestination = path.join(backupDirectory, `media-${stamp}`);
	await db.backup(destination);
	await cp(mediaDirectory, mediaDestination, { recursive: true, force: true });
	return json({ backedUp: true, database: destination, media: mediaDestination });
});
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { json, requireSession, route } from '../../lib/server/http';
import { ensureStorageDirectories, mediaDirectory } from '../../lib/server/storage';

const allowedTypes = new Map([['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif']]);
const maxBytes = 5 * 1024 * 1024;

export const POST = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const form = await context.request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) return json({ error: 'file_required' }, 400);
	const extension = allowedTypes.get(file.type);
	if (!extension || file.size > maxBytes) return json({ error: 'unsupported_file' }, 400);
	await ensureStorageDirectories();
	const filename = `${Date.now()}-${randomBytes(8).toString('hex')}${extension}`;
	await writeFile(path.join(mediaDirectory, filename), Buffer.from(await file.arrayBuffer()), { flag: 'wx' });
	return json({ url: `/media/${filename}`, filename }, 201);
});
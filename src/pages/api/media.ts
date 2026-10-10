import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { json, requireSession, route } from '../../lib/server/http';
import { ensureStorageDirectories, mediaDirectory } from '../../lib/server/storage';

const allowedTypes = new Map([['image/jpeg', { extension: '.jpg', format: 'jpeg' as const }], ['image/png', { extension: '.png', format: 'png' as const }], ['image/webp', { extension: '.webp', format: 'webp' as const }]]);
const maxBytes = 5 * 1024 * 1024;

export const POST = route(async (context) => {
	const auth = requireSession(context, true);
	if ('response' in auth) return auth.response;
	const form = await context.request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) return json({ error: 'file_required' }, 400);
	const imageType = allowedTypes.get(file.type);
	if (!imageType || file.size > maxBytes) return json({ error: 'unsupported_file' }, 400);
	const input = Buffer.from(await file.arrayBuffer());
	let metadata;
	try {
		metadata = await sharp(input, { failOn: 'error' }).metadata();
	} catch {
		return json({ error: 'invalid_image' }, 400);
	}
	if (!metadata.width || !metadata.height) return json({ error: 'invalid_image' }, 400);
	await ensureStorageDirectories();
	const baseName = `${Date.now()}-${randomBytes(8).toString('hex')}`;
	const originalFilename = `${baseName}${imageType.extension}`;
	const widths = [768, 1536, 2400].filter((width) => width < metadata.width!);
	const variants = await Promise.all(widths.map(async (width) => {
		const filename = `${baseName}-${width}${imageType.extension}`;
		const output = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).toFormat(imageType.format).toBuffer();
		await writeFile(path.join(mediaDirectory, filename), output, { flag: 'wx' });
		return { width, url: `/media/${filename}` };
	}));
	const optimized = await sharp(input).rotate().resize({ width: 2400, withoutEnlargement: true }).toFormat(imageType.format).toBuffer();
	await writeFile(path.join(mediaDirectory, originalFilename), optimized, { flag: 'wx' });
	return json({ url: `/media/${originalFilename}`, filename: originalFilename, width: metadata.width, height: metadata.height, variants, srcset: variants.map((variant) => `${variant.url} ${variant.width}w`).join(', ') }, 201);
});
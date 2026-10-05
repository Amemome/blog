import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { APIRoute } from 'astro';
import { mediaDirectory } from '../../lib/server/storage';

export const GET: APIRoute = async ({ params }) => {
	const relativePath = params.path ?? '';
	const filePath = path.resolve(mediaDirectory, relativePath);
	if (!filePath.startsWith(`${mediaDirectory}${path.sep}`)) return new Response(null, { status: 404 });
	try {
		const file = await readFile(filePath);
		const extension = path.extname(filePath).toLowerCase();
		const contentType = ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' } as Record<string, string>)[extension] ?? 'application/octet-stream';
		return new Response(file, { headers: { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable' } });
	} catch {
		return new Response(null, { status: 404 });
	}
};
import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/server/content';

export const GET: APIRoute = ({ site, url }) => {
	const origin = site?.toString().replace(/\/$/, '') ?? url.origin;
	const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
	const paths = ['/', '/blog/', ...getPublishedPosts().map((post) => `/blog/${post.slug}`)];
	const urls = paths.map((path) => `<url><loc>${escapeXml(new URL(path, `${origin}/`).toString())}</loc></url>`).join('');
	return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
};
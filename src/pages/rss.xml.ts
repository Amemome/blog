import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/server/content';

export const GET: APIRoute = ({ site, url }) => {
	const origin = site?.toString() ?? url.origin;
	const items = getPublishedPosts().map((post) => `<item><title><![CDATA[${post.title}]]></title><link>${origin}/blog/${post.slug}</link><guid>${origin}/blog/${post.slug}</guid><description><![CDATA[${post.excerpt}]]></description><pubDate>${new Date(post.date.replaceAll('.', '-')).toUTCString()}</pubDate></item>`).join('');
	return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Orbital Notes</title><link>${origin}</link><description>생각과 관측을 천천히 기록하는 개인 블로그.</description>${items}</channel></rss>`, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
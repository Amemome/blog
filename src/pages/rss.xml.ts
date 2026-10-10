import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/server/content';

export const GET: APIRoute = ({ site, url }) => {
	const origin = (site?.toString() ?? url.origin).replace(/\/$/, '');
	const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
	const cdata = (value: string) => `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
	const items = getPublishedPosts().map((post) => {
		const link = `${origin}/blog/${encodeURIComponent(post.slug)}`;
		return `<item><title>${cdata(post.title)}</title><link>${escapeXml(link)}</link><guid isPermaLink="true">${escapeXml(link)}</guid><description>${cdata(post.excerpt)}</description><pubDate>${new Date(post.date.replaceAll('.', '-')).toUTCString()}</pubDate></item>`;
	}).join('');
	return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${cdata('Orbital Notes')}</title><link>${escapeXml(origin)}</link><description>${cdata('생각과 관측을 천천히 기록하는 개인 블로그.')}</description>${items}</channel></rss>`, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
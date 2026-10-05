import type { Post } from '../../data/posts';
import { db, type PostRecord, serializePost } from './db';
import { renderMarkdown } from './markdown';

const formatDate = (value: string | null) => {
	if (!value) return '';
	if (/^\d{4}\.\d{2}\.\d{2}$/.test(value)) return value;
	return value.slice(0, 10).replaceAll('-', '.');
};

const toPost = (record: PostRecord): Post => {
	const serialized = serializePost(record);
	const wordCount = record.body.trim() ? record.body.trim().split(/\s+/).length : 0;
	return {
		title: record.title,
		slug: record.slug,
		excerpt: record.excerpt,
		content: [renderMarkdown(record.body)],
		date: formatDate(record.published_at || record.updated_at),
		readTime: `${Math.max(1, Math.ceil(wordCount / 180))} min read`,
		category: record.category_slug,
		tags: serialized.tags,
		coverUrl: record.cover_url,
		socialTitle: record.social_title,
		socialDescription: record.social_description,
		accent: 'violet',
	};
};

export const getPublishedPosts = () => {
	db.prepare("UPDATE posts SET status = 'published', published_at = scheduled_at, scheduled_at = NULL, updated_at = ? WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?").run(new Date().toISOString(), new Date().toISOString());
	const records = db.prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC, updated_at DESC").all() as PostRecord[];
	return records.map(toPost);
};

export const getPublishedPost = (slug: string) => {
	const record = db.prepare("SELECT * FROM posts WHERE slug = ? AND status = 'published'").get(slug) as PostRecord | undefined;
	return record ? toPost(record) : undefined;
};

export const getPublicCategories = () => db.prepare('SELECT name, slug, accent FROM categories ORDER BY name').all() as { name: string; slug: string; accent: string }[];

export const getCategoryBySlug = (slug: string) => getPublicCategories().find((category) => category.slug === slug);

export const allPublishedTags = () => [...new Set(getPublishedPosts().flatMap((post) => post.tags))];

import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { categories as seedCategories, posts as seedPosts } from '../../data/posts';

const databasePath = resolve(process.env.DATABASE_PATH ?? './data/blog.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });

export const db = new Database(databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
	CREATE TABLE IF NOT EXISTS categories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		slug TEXT NOT NULL UNIQUE,
		accent TEXT NOT NULL DEFAULT 'violet',
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS posts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		slug TEXT NOT NULL UNIQUE,
		excerpt TEXT NOT NULL DEFAULT '',
		body TEXT NOT NULL DEFAULT '',
		category_slug TEXT NOT NULL REFERENCES categories(slug),
		tags TEXT NOT NULL DEFAULT '[]',
		cover_url TEXT,
		social_title TEXT,
		social_description TEXT,
		status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished', 'scheduled', 'deleted')),
		published_at TEXT,
		scheduled_at TEXT,
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS post_revisions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
		snapshot TEXT NOT NULL,
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS sessions (
		token_hash TEXT PRIMARY KEY,
		csrf_token TEXT NOT NULL,
		expires_at INTEGER NOT NULL,
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS auth_events (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		event TEXT NOT NULL,
		ip TEXT NOT NULL DEFAULT '',
		created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS login_attempts (
		key TEXT PRIMARY KEY,
		failed_count INTEGER NOT NULL DEFAULT 0,
		window_started_at INTEGER NOT NULL,
		blocked_until INTEGER NOT NULL DEFAULT 0
	);
`);

const columns = db.prepare('PRAGMA table_info(posts)').all() as { name: string }[];
const existingColumns = new Set(columns.map((column) => column.name));
for (const [name, definition] of [['cover_url', 'TEXT'], ['social_title', 'TEXT'], ['social_description', 'TEXT'], ['scheduled_at', 'TEXT']] as const) {
	if (!existingColumns.has(name)) db.exec(`ALTER TABLE posts ADD COLUMN ${name} ${definition}`);
}

const categoryCount = db.prepare('SELECT COUNT(*) AS count FROM categories').get() as { count: number };
if (categoryCount.count === 0) {
	const insertCategory = db.prepare('INSERT INTO categories (name, slug, accent) VALUES (?, ?, ?)');
	const seed = db.transaction(() => seedCategories.forEach((category) => insertCategory.run(category.name, category.slug, category.accent)));
	seed();
}

const postCount = db.prepare('SELECT COUNT(*) AS count FROM posts').get() as { count: number };
if (postCount.count === 0) {
	const insertPost = db.prepare(`INSERT INTO posts (title, slug, excerpt, body, category_slug, tags, status, published_at) VALUES (?, ?, ?, ?, ?, ?, 'published', ?)`);
	const seed = db.transaction(() => seedPosts.forEach((post) => insertPost.run(post.title, post.slug, post.excerpt, post.content.join('\n\n'), post.category, JSON.stringify(post.tags), post.date)));
	seed();
}

export type PostStatus = 'draft' | 'published' | 'unpublished' | 'scheduled' | 'deleted';
export type PostRecord = {
	id: number;
	title: string;
	slug: string;
	excerpt: string;
	body: string;
	category_slug: string;
	tags: string;
	status: PostStatus;
	published_at: string | null;
	created_at: string;
	updated_at: string;
	cover_url: string | null;
	social_title: string | null;
	social_description: string | null;
	scheduled_at: string | null;
};

export const serializePost = (post: PostRecord) => ({
	...post,
	tags: JSON.parse(post.tags) as string[],
});

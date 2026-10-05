# blog

day1banana's personal private simple blog.

FE: Astro. using for simple, fast develop.
BE(Headless CMS): Strapi. Private memos are stored only on Oracle Cloud.
DB: SQLite. This blog is used and read by one person, so a lightweight setup is enough.

## Product requirements

- Browse published posts from the public Astro site.
- Use `/blog/` as the dedicated reading space for browsing multiple posts.
- Open individual post pages from the `/blog/` archive and filter the archive by category without a separate `/categories/` route.
- Make category selection a prominent, distinctive part of the `/blog/` design rather than a plain text list.
- Write, edit, save drafts, publish, unpublish, and delete posts from a protected admin page.
- Create, edit, and delete categories from the protected admin page, and assign one primary category to every post. Tags may be used for additional, cross-cutting topics.
- Require authentication for the admin page and authorization for every write or publishing operation.
- Keep drafts, admin APIs, credentials, and private content out of the public Astro build.

### Authoring requirements

- Support writing posts in Markdown.
- Render Markdown while writing so the author can see the formatted result in a Notion-like editor or split preview.
- Allow existing posts to be opened and edited from the admin page while preserving their slug, category, tags, and metadata unless intentionally changed.
- Allow a new category to be created directly beside the category selector while writing, without leaving the editor.
- Provide a rendered preview before publishing.
- Autosave drafts and recover the latest unsaved or saved version after an interruption.
- Keep revision history and allow the author to restore an earlier version.
- Support draft, published, unpublished, scheduled, and deleted states, with a confirmation step before destructive deletion.
- Calculate reading time automatically and allow the author to edit the excerpt, slug, cover image, and social preview metadata.
- Support image/file upload, inline image insertion, responsive image optimization, and controlled media storage.

### Discovery and sharing requirements

- Search published posts by title, body, category, and tag.
- Provide related-post recommendations where enough content exists.
- Provide RSS, sitemap, canonical URLs, and Open Graph metadata for published posts.
- Support keyboard navigation, accessible labels, focus states, and responsive layouts.
- Show useful empty, loading, error, and not-found states in the archive and admin UI.

### Operations and security requirements

- Back up SQLite and uploaded media automatically, export content as JSON, and document and test restoration.
- Rate-limit login attempts, record relevant authentication activity, and protect cookie-based mutations against CSRF.
- Provide a publish/build status so the author can tell whether a newly published post is deployed.
- Keep the public site privacy-conscious; do not add tracking or analytics without an explicit decision.

### Implemented application surface

- `/blog/` provides a multi-post archive with category filtering, tag filtering, search, empty states, and responsive cards.
- `/blog/[slug]` provides post details, related posts, and an edit link into the writing page.
- `/admin/` provides authenticated API-backed create/edit/draft/publish/unpublish/schedule/delete flows, server autosave, local interruption recovery, revision restore, metadata editing, category creation, and media upload.
- Server routes provide rate-limited login, activity logging, CSRF checks, SQLite backup, JSON export, publish status, and controlled media storage.
- `/rss.xml`, `/sitemap.xml`, canonical URLs, Open Graph metadata, and sanitized Markdown rendering are generated from published content.

### Operational follow-up

Production deployment still needs encrypted off-host backup retention, a scheduled backup runner, HTTPS/reverse-proxy hardening, and a CI deploy webhook. The current Astro server exposes these local authenticated primitives through `/api/admin/backup`, `/api/admin/export`, and `/api/admin/status`.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the development and deployment architecture.

## Development

```bash
npm install
npm run dev
```

The Astro site currently uses typed sample content in `src/data/posts.ts`. Strapi can replace that adapter in the next step without changing the page routes. See [ARCHITECTURE.md](ARCHITECTURE.md) for the planned content model, admin flow, and security boundaries.
## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Product requirements

- The public Astro site has a dedicated `/blog/` archive for browsing multiple published posts.
- The `/blog/` archive uses a distinctive category selector to filter posts; do not introduce a separate `/categories/` route.
- Individual published posts are opened from `/blog/` through `/blog/[slug]`.
- The author needs a protected admin page for creating, editing, drafting, publishing, unpublishing, and deleting posts.
- The author can create, edit, and delete categories in the protected admin page. Every post has one primary category; tags are optional additional metadata.
- The writing form should include a natural inline control for adding a new category without leaving the editor.
- The admin workflow must support Markdown writing, live rendered Markdown preview in a Notion-like editor, opening and editing existing posts, autosave, revision restore, scheduling, reading-time calculation, excerpt/slug/cover/social metadata, media upload, and destructive-action confirmation.
- Published content must support search, related posts, RSS, sitemap, canonical URLs, Open Graph metadata, accessible states, and responsive layouts.
- The system must support SQLite/media backups, JSON export, documented restore tests, publish/build status, login rate limiting, authentication activity logging, and CSRF protection.
- Do not add tracking or analytics without an explicit product decision.
- Admin authentication and server-side authorization are required. Protecting a frontend route or hiding an admin URL is not sufficient.
- Drafts, admin credentials, private APIs, and write operations must never be exposed in the public Astro build.

The repository currently contains an Astro frontend prototype for `/blog/`, `/blog/[slug]`, and `/admin/`. The admin editor, Markdown preview, edit flow, local drafts, and local category creation are frontend-only and use sample data or `localStorage`. Treat Strapi persistence, category CRUD APIs, authentication, server-side authorization, publishing, and production search/SEO/backup integrations as planned work unless implemented.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

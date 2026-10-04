# Blog Architecture

## 1. Goals

- Keep personal memo content in Oracle Cloud.
- Keep the public reading experience fast and mostly static.
- Use the smallest operational setup that fits a single reader and writer.
- Make backups and recovery explicit because SQLite is the source of truth.

## 2. High-level architecture

```text
                         publish webhook
                              |
                              v
Reader -> Astro static site -> Strapi REST API (published content only)
              ^                         ^
              |                         |
      CI build/deploy        Protected admin UI + API auth
                                        |
                                  SQLite volume
                                        |
                                OCI backup storage
```

### Runtime components

| Component | Responsibility | Initial deployment |
| --- | --- | --- |
| Astro | Renders posts, categories, tags, search UI, and static pages | Static output behind Caddy/Nginx |
| Strapi | Admin UI, draft/publish workflow, content API | Private OCI VM/container |
| SQLite | Strapi database and source of truth | Persistent OCI block volume |
| Caddy or Nginx | TLS termination and reverse proxy | Same OCI VM |
| CI/CD | Builds Astro and deploys the generated site | GitHub Actions or equivalent |
| OCI Object Storage | Off-host backups of SQLite and media | Scheduled backup target |

The first version should use one OCI VM and Docker Compose. This keeps the deployment understandable and avoids introducing Kubernetes or a second database before the workload needs it.

## 2.1 Product scope

The blog has two distinct areas:

- **Public reading area**: the `/blog/` archive, published post detail pages, category navigation, tags, and search. It must not expose drafts or write APIs.
- **Admin area**: a protected page where the owner can create and edit posts, create/edit/delete categories and tags, add a category directly from the writing form, assign categories, save drafts, preview, publish, schedule, unpublish, restore revisions, and delete content.

The `/blog/` archive is the single public space for browsing posts. It should include a distinctive category selector with a clear active state, useful empty states, and a layout that supports scanning many posts. Category changes should filter the archive in place or through a query parameter; do not create a separate `/categories/` route.

The first authoring editor should use Markdown as the canonical body format. While writing, the admin page must render the Markdown result in a Notion-like editor or split preview so headings, emphasis, links, lists, code, and quotes are visible before publishing. Existing posts must be editable from the admin page without losing their current metadata unless the author changes it. Keeping Markdown canonical makes exports, revisions, backups, and future migrations portable.

The admin area is an authoring interface, not a second public-facing blog. Authentication identifies the owner, and authorization must be checked again by the CMS API for every read of private content and every mutation. A hidden URL is not an access control mechanism.

### Current frontend milestone

The Astro frontend currently implements the public `/blog/` archive, category/tag filtering, client-side search, post detail pages, related-post links, and a responsive `/admin/` writing prototype. The writing prototype supports new posts, editing seeded posts through `/admin/?edit=slug`, Markdown input with live rendered preview, local draft persistence, and inline local category creation. These are frontend-only behaviors backed by sample data and `localStorage`; they are not the authenticated CMS workflow.

The next integration must replace local sample data and browser storage with server-backed Strapi operations, then enforce authentication and authorization before exposing the admin workflow in production.

## 3. Request and publishing flows

### Reading a post

1. A reader requests the Astro site.
2. The static site serves the page directly from the web server or CDN.
3. During a build, Astro fetches only published entries from Strapi's public API.
4. Drafts and admin endpoints are never included in the public build.

### Publishing a post

1. The author opens the protected admin page and authenticates.
2. The author creates or edits a post, selects a category, optionally adds tags, and saves a draft.
3. The author publishes the draft after reviewing it, or unpublishes it to remove it from the public site.
4. Strapi sends a signed webhook to CI/CD after a publish-state change.
5. CI/CD runs the Astro build against the Strapi API and deploys the generated output.
6. The old static site remains available until the new deployment is healthy.

If webhook-driven builds are unavailable initially, a manual build/deploy command is an acceptable first milestone. The public site must not query draft content at runtime.

## 4. Content model

Start with a deliberately small model:

- `Post`: title, slug, excerpt, Markdown body, cover image (optional), category, tags, status, published date, updated date.
- `Category`: name, slug, description (optional), display order (optional), visual accent (optional).
- `Tag`: name, slug.
- `Media`: original file, optimized variants, alt text, dimensions, and storage key.
- `PostRevision`: post reference, Markdown body, metadata snapshot, author, and created date.
- `Post` to `Category`: many-to-one relation; every published post must have one primary category.
- `Post` to `Tag`: many-to-many relation.
- `Post` to `PostRevision`: one-to-many relation for recovery and restore.

Strapi's draft/publish feature controls visibility. Astro should validate the response shape at the API boundary and render an explicit not-found page when a slug is missing or unpublished. The `/blog/` archive should display published posts only and handle an unknown category filter without exposing private content.

The planned routes are:

- `/`: landing page and recent highlights.
- `/blog/`: multi-post archive with the category selector and filtering.
- `/blog/[slug]`: published post detail reached from the archive.
- `/rss.xml`: published-post RSS feed.
- `/sitemap-index.xml`: sitemap for public pages.
- `/admin`: authenticated authoring UI; never included in the public static build.
- `/admin/preview/[id]`: authenticated draft preview, never exposed to public readers or the static build.

## 5. Security boundaries

- Keep the admin UI, Strapi Admin, and private Strapi API behind HTTPS, an allowlist, VPN, or an additional access layer.
- Require strong authentication for the admin area and use secure, HttpOnly, SameSite session cookies or an equivalent server-managed session.
- Enforce authorization on the server for post creation, editing, deletion, draft access, category/tag creation, editing and deletion, and publish/unpublish operations.
- Require authorization for previews, media uploads, revision access, scheduled publishing, exports, and backup/restore operations.
- Use a single-owner role initially; do not assume that frontend route protection is sufficient authorization.
- Expose only the minimum read permissions required for published posts.
- Do not put Strapi admin tokens, session secrets, webhook secrets, or OCI credentials in Astro client code.
- Store secrets in CI/CD secrets and the server's protected environment, never in Git.
- Use separate read-only build credentials if the API cannot be public.
- Restrict the VM firewall to SSH from a trusted source and HTTPS from the internet.
- Disable public access to SQLite and uploaded media directories.
- Add CSRF protection to state-changing admin requests when cookie-based sessions are used, and rate-limit authentication endpoints.
- Record authentication and publishing activity without storing unnecessary personal data.

The frontend should be treated as public even if the content is personally written. If the entire blog must be private, add authentication at the reverse proxy or identity layer; do not rely on hiding Strapi endpoints.

## 6. Data and backup plan

SQLite is a good fit for the initial single-node workload, but it requires operational discipline:

- Put the database file and Strapi uploads on a persistent OCI block volume.
- Back up with SQLite's online backup mechanism or a Strapi-aware stop/backup window; do not copy a live database file blindly.
- Encrypt backups and keep at least one copy outside the VM in OCI Object Storage.
- Retain daily backups for 14 days and a weekly backup for 8 weeks.
- Periodically restore a backup into a disposable Strapi instance.
- Record the Strapi version, Node version, schema changes, and restore steps.
- Export posts, categories, tags, and metadata as JSON for a provider-independent recovery path.
- Include uploaded media in backup coverage and verify that optimized variants can be regenerated.

SQLite should remain single-writer and single-node. Move to PostgreSQL only when concurrent writes, multiple application instances, or operational limits make that tradeoff worthwhile.

## 7. Repository shape

The repository can grow into this structure without coupling the frontend to Strapi internals:

```text
blog/
├── apps/
│   ├── web/                 # Astro frontend
│   └── cms/                 # Strapi application
├── infra/
│   ├── compose.yaml         # Local/OCI service wiring
│   ├── Caddyfile            # TLS and reverse proxy rules
│   └── backup/              # Backup and restore scripts
├── packages/
│   └── content-contract/    # Shared API types/schema, if needed
├── .github/workflows/
│   └── deploy-web.yml
└── ARCHITECTURE.md
```

Keep Strapi-generated files inside `apps/cms`. The Astro app should consume a small typed content client rather than importing CMS-specific models throughout page components.

## 8. Development environments

### Local

- Run Astro and Strapi independently with environment files that are ignored by Git.
- Use a local SQLite file for Strapi.
- Use seeded example posts; never copy private production content into the repository.
- Point Astro at the local Strapi URL through an environment variable.

### Production

- Run Strapi and the reverse proxy on the OCI VM with Docker Compose.
- Mount SQLite and uploads from persistent storage.
- Build Astro in CI and deploy immutable static output.
- Run migrations or Strapi upgrades only after a verified backup.

## 9. Delivery milestones

1. Create `apps/web` and `apps/cms` with pinned Node and package-manager versions.
2. Define the Post, Category, and Tag content types and verify draft/publish behavior.
3. Build the Astro content client, `/blog/` multi-post archive, `/blog/[slug]` detail page, distinctive category selector, and 404 page.
4. Build the protected admin page and authoring workflow for post create, edit, draft, publish, unpublish, and delete.
5. Add category and tag CRUD to the protected admin workflow.
6. Add Markdown preview, autosave, revision restore, scheduling, reading-time calculation, and media management.
7. Add authentication, server-side authorization, CSRF protection, rate limiting, and activity logging for the admin workflow.
8. Add search, related posts, RSS, sitemap, SEO metadata, accessibility states, and responsive behavior.
9. Add local Compose wiring and environment variable validation.
10. Add CI build checks, publish/build status, and a manual static deployment.
11. Add the publish webhook, OCI reverse proxy, HTTPS, and firewall rules.
12. Add scheduled encrypted backups, JSON export, media backup, and perform a restore drill.

## 10. Decisions to revisit

- Whether the public site also needs authentication; the admin area requires authentication regardless.
- Whether analytics are needed; default to no tracking until there is a clear use case.
- Whether images should remain on the VM or move to OCI Object Storage.
- Whether build-time publishing latency is acceptable; if not, consider Astro SSR.
- Whether SQLite remains suitable before adding any second application instance.
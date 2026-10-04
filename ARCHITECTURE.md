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
       CI build/deploy            Admin UI + API auth
                                        |
                                  SQLite volume
                                        |
                                OCI backup storage
```

### Runtime components

| Component | Responsibility | Initial deployment |
| --- | --- | --- |
| Astro | Renders posts, tags, search UI, and static pages | Static output behind Caddy/Nginx |
| Strapi | Admin UI, draft/publish workflow, content API | Private OCI VM/container |
| SQLite | Strapi database and source of truth | Persistent OCI block volume |
| Caddy or Nginx | TLS termination and reverse proxy | Same OCI VM |
| CI/CD | Builds Astro and deploys the generated site | GitHub Actions or equivalent |
| OCI Object Storage | Off-host backups of SQLite and media | Scheduled backup target |

The first version should use one OCI VM and Docker Compose. This keeps the deployment understandable and avoids introducing Kubernetes or a second database before the workload needs it.

## 3. Request and publishing flows

### Reading a post

1. A reader requests the Astro site.
2. The static site serves the page directly from the web server or CDN.
3. During a build, Astro fetches only published entries from Strapi's public API.
4. Drafts and admin endpoints are never included in the public build.

### Publishing a post

1. The author signs in to Strapi over an admin-only HTTPS endpoint.
2. The author saves a draft and publishes it.
3. Strapi sends a signed webhook to CI/CD.
4. CI/CD runs the Astro build against the Strapi API and deploys the generated output.
5. The old static site remains available until the new deployment is healthy.

If webhook-driven builds are unavailable initially, a manual build/deploy command is an acceptable first milestone. The public site must not query draft content at runtime.

## 4. Content model

Start with a deliberately small model:

- `Post`: title, slug, excerpt, body, cover image (optional), status, published date, updated date.
- `Tag`: name, slug.
- `Post` to `Tag`: many-to-many relation.

Strapi's draft/publish feature controls visibility. Astro should validate the response shape at the API boundary and render an explicit not-found page when a slug is missing or unpublished.

## 5. Security boundaries

- Keep Strapi Admin and the Strapi API private behind HTTPS, an allowlist, VPN, or an additional access layer.
- Expose only the minimum read permissions required for published posts.
- Do not put Strapi admin tokens, webhook secrets, or OCI credentials in Astro client code.
- Store secrets in CI/CD secrets and the server's protected environment, never in Git.
- Use separate read-only build credentials if the API cannot be public.
- Restrict the VM firewall to SSH from a trusted source and HTTPS from the internet.
- Disable public access to SQLite and uploaded media directories.

The frontend should be treated as public even if the content is personally written. If the entire blog must be private, add authentication at the reverse proxy or identity layer; do not rely on hiding Strapi endpoints.

## 6. Data and backup plan

SQLite is a good fit for the initial single-node workload, but it requires operational discipline:

- Put the database file and Strapi uploads on a persistent OCI block volume.
- Back up with SQLite's online backup mechanism or a Strapi-aware stop/backup window; do not copy a live database file blindly.
- Encrypt backups and keep at least one copy outside the VM in OCI Object Storage.
- Retain daily backups for 14 days and a weekly backup for 8 weeks.
- Periodically restore a backup into a disposable Strapi instance.
- Record the Strapi version, Node version, schema changes, and restore steps.

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
2. Define the Post and Tag content types and verify draft/publish behavior.
3. Build the Astro content client, post list, post detail, and 404 page.
4. Add local Compose wiring and environment variable validation.
5. Add CI build checks and a manual static deployment.
6. Add the publish webhook, OCI reverse proxy, HTTPS, and firewall rules.
7. Add scheduled encrypted backups and perform a restore drill.

## 10. Decisions to revisit

- Whether the public site needs authentication.
- Whether images should remain on the VM or move to OCI Object Storage.
- Whether build-time publishing latency is acceptable; if not, consider Astro SSR.
- Whether SQLite remains suitable before adding any second application instance.
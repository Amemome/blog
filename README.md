# blog

day1banana's personal private simple blog.

FE: Astro. using for simple, fast develop.
BE(Headless CMS) : Strapi. i don't want upload my private memos. So i store that only Oracle cloud.
DB: SQLite. Anyway, this blog will be used, read by me. i need just lite.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the development and deployment architecture.

## Development

```bash
npm install
npm run dev
```

The Astro site currently uses typed sample content in `src/data/posts.ts`. Strapi can replace that adapter in the next step without changing the page routes.
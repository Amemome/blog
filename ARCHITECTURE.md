# Blog Architecture

## 현재 구조

```text
Reader -> Astro Node SSR -> SQLite (published rows only)
                         ^
                 protected admin UI/API
                         ^
                    Nginx / HTTPS
                         ^
                    SQLite/media backup
```

| 구성 | 역할 |
| --- | --- |
| Astro + `@astrojs/node` | 공개 페이지, 관리자 페이지, API를 제공하는 SSR 서버 |
| SQLite + better-sqlite3 | 글·카테고리·revision·세션의 source of truth |
| `data/media` | 인증된 업로드가 저장되는 미디어 디렉터리 |
| Nginx | HTTPS 종료와 localhost Node 서버 reverse proxy |
| systemd timer | SQLite와 미디어의 일일 백업 실행 |

외부 CMS, Strapi, CI/CD, webhook은 현재 런타임 경로에 포함되지 않습니다.

## 공개 영역

- `/blog/`는 `status = 'published'`인 글만 읽습니다.
- `/blog/[slug]`, `/rss.xml`, `/sitemap.xml`도 게시된 글만 노출합니다.
- `/notes/`와 `/api/notes`도 `published` 노트만 공개합니다.
- 검색은 공개 archive에 이미 렌더링된 게시된 글을 대상으로 합니다.
- 초안·비공개·삭제 글과 write API는 공개 화면에서 접근할 수 없습니다.

## 관리자 영역

`/admin/`은 세션 쿠키로 보호되며, 모든 private API는 서버에서 세션을 다시 확인합니다. 상태 변경 요청에는 double-submit CSRF 토큰이 필요합니다.

게시글 상태는 다음 네 가지입니다.

- `draft`: 임시저장 및 자동저장 상태
- `published`: 공개 영역에 게시된 상태
- `unpublished`: 게시 이력이 있지만 공개하지 않는 상태
- `deleted`: soft delete 상태

예약발행은 의도적으로 제거했습니다. 기존 데이터베이스에 남은 `scheduled` row는 시작 시 `draft`로 변환됩니다.

## 데이터 모델

- `posts`: 제목, slug, excerpt, Markdown body, category, tags, 상태, cover/social metadata
- `notes`: 짧은 Markdown body, 상태, 작성·수정 시각
- `categories`: 이름, slug, accent
- `post_revisions`: 게시글별 metadata와 Markdown snapshot
- `sessions`: hash된 session token과 CSRF token
- `auth_events`: 로그인·로그아웃·게시 이벤트
- `login_attempts`: 로그인 실패 rate limit 상태

모든 public content는 DB 조회 직전에 게시 상태로 제한됩니다. Markdown HTML은 `sanitize-html`로 정리합니다.

## 미디어와 백업

인증된 `/api/media` 업로드는 JPEG·PNG·WebP만 허용하고 `sharp`로 실제 이미지 형식을 확인합니다. 원본은 최대 2400px로 최적화되며 768px·1536px 변형이 생성됩니다.

`scripts/backup.sh`는 SQLite online backup과 미디어 tar를 생성합니다. 기본 보존은 일일 14일, 주간 8주이며 `BACKUP_GPG_RECIPIENT`로 암호화할 수 있습니다. `BACKUP_REMOTE_DIR`를 설정하면 생성된 백업을 별도 마운트나 외부 동기화 경로로 복제합니다.

복원 절차는 [`OPERATIONS.md`](OPERATIONS.md)에 기록합니다. 운영자는 분기마다 임시 `DATABASE_PATH`와 `MEDIA_DIR`로 복원을 확인해야 합니다. JSON export에는 게시글과 노트가 모두 포함됩니다.

## 배포

```text
Internet -> Nginx :443 -> 127.0.0.1:4321 -> Astro standalone -> SQLite/media
```

운영 서비스 파일은 [`deploy/blog.service`](deploy/blog.service), 백업 timer는 [`deploy/blog-backup.timer`](deploy/blog-backup.timer)에 있습니다. 배포 여부는 외부 CI 상태가 아니라 관리자 게시글 상태로 관리합니다.
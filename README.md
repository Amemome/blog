# Orbital Notes

Astro Node SSR과 SQLite로 동작하는 개인 블로그입니다. 공개 글은 `/blog/`에서 탐색하며, 관리자 글쓰기와 private API는 세션 인증으로 보호합니다.

## 현재 기능

- `/blog/`: 게시된 글 archive, 카테고리·태그 필터, 제목·본문 검색
- `/blog/[slug]`: 게시된 글 상세, 관련 글, canonical/Open Graph 메타데이터
- `/admin/`: 글 작성·수정·자동저장·revision 복원·미리보기·미디어 업로드
- `/notes/`: 짧은 생각을 시간순으로 읽는 공개 노트 스트림
- `/admin/notes/`: 빠른 생각 임시저장·게시·비공개·삭제 화면
- 글 상태: `draft`(임시저장), `published`(게시됨), `unpublished`(비공개), `deleted`(삭제됨)
- 카테고리 생성·수정·삭제와 글 작성 중 inline 카테고리 생성
- Markdown 렌더링과 sanitization, 이미지 검증·최적화·responsive 변형 생성
- RSS, sitemap, JSON export, SQLite·미디어 백업
- 로그인 rate limit, 인증 이벤트 기록, 서버 권한 검사, CSRF 보호

짧은 노트는 긴 글과 별도의 SQLite 테이블에 저장하며 Markdown을 사용할 수 있습니다. 노트도 `draft`, `published`, `unpublished`, `deleted` 상태를 사용하고 공개 영역에는 `published`만 표시됩니다.

예약발행은 지원하지 않습니다. 기존 데이터에 예약 상태가 남아 있으면 애플리케이션 시작 시 공개되지 않는 임시저장 상태로 변환합니다.

## 상태 규칙

`published` 글만 public archive, 상세 페이지, RSS, sitemap에 노출됩니다. `draft`, `unpublished`, `deleted` 글은 인증된 관리자 API에서만 확인할 수 있습니다. 삭제는 복구 가능성을 위해 soft delete로 처리됩니다.

## 개발

```bash
npm install
npm run dev
npm run build
```

필수 환경 변수 예시는 [`.env.example`](.env.example)에 있습니다. 운영 배포는 Astro standalone Node 서버와 Nginx reverse proxy를 사용하며, 상세 절차는 [`DEPLOYMENT.md`](DEPLOYMENT.md)를 참고합니다.
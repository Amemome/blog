# 운영 및 복원 절차

## 환경 변수

`DATABASE_PATH`, `MEDIA_DIR`, `BACKUP_DIR`, `PUBLIC_SITE_URL`을 `.env`에 설정한다. 운영에서는 `ADMIN_PASSWORD` 대신 `ADMIN_PASSWORD_HASH`를 사용한다.

## 백업

인증된 관리자 세션으로 `POST /api/admin/backup`을 호출하면 SQLite online backup이 `BACKUP_DIR`에 생성된다. `GET /api/admin/export`는 게시글, 카테고리, revision을 JSON으로 반환한다. 미디어는 `MEDIA_DIR` 전체를 같은 백업 작업에서 암호화된 외부 저장소로 복사해야 한다.

```bash
curl -b cookies.txt -H "x-csrf-token: $CSRF" -X POST http://localhost:4321/api/admin/backup
curl -b cookies.txt http://localhost:4321/api/admin/export > export.json
```

운영에서는 cron 또는 CI 작업으로 일일 백업을 실행하고, 14일 일일 보관과 8주 주간 보관을 유지한다. 백업 파일과 미디어는 VM 외부의 암호화된 저장소에도 복제한다.

## 복원 테스트

1. 별도 임시 `DATABASE_PATH`와 `MEDIA_DIR`를 지정한다.
2. SQLite backup을 복사하고 애플리케이션을 시작한다.
3. `/blog/`에서 published 글, `/api/admin/export`에서 revision/category 수를 확인한다.
4. 미디어 URL을 열고 게시글의 Markdown 이미지가 표시되는지 확인한다.
5. 임시 데이터베이스와 미디어를 삭제한다.

복원 테스트는 분기마다 수행하고 날짜, 애플리케이션 버전, 백업 파일, 결과를 운영 기록에 남긴다.
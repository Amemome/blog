# 운영 및 복원 절차

## 환경 변수

`DATABASE_PATH`, `MEDIA_DIR`, `BACKUP_DIR`, `PUBLIC_SITE_URL`을 `.env`에 설정한다. 외부 백업 경로를 사용할 경우 `BACKUP_REMOTE_DIR`을 추가한다. 운영에서는 `ADMIN_PASSWORD` 대신 `ADMIN_PASSWORD_HASH`를 사용한다.

## 백업

인증된 관리자 세션으로 `POST /api/admin/backup`을 호출하면 SQLite online backup과 미디어 디렉터리 복사본이 `BACKUP_DIR`에 생성된다. `GET /api/admin/export`는 게시글, 짧은 노트, 카테고리, revision을 JSON으로 반환한다. 자동 백업은 `scripts/backup.sh`와 systemd timer를 사용한다.

```bash
curl -b cookies.txt -H "x-csrf-token: $CSRF" -X POST http://localhost:4321/api/admin/backup
curl -b cookies.txt http://localhost:4321/api/admin/export > export.json
```

운영에서는 systemd timer로 일일 백업을 실행하고, 14일 일일 보관과 8주 주간 보관을 유지한다. `BACKUP_GPG_RECIPIENT`를 설정하면 백업 파일을 암호화하고, `BACKUP_REMOTE_DIR`를 외부 마운트 또는 별도 동기화 경로로 지정해 VM 외부에도 복제한다.

## 복원 테스트

1. 별도 임시 `DATABASE_PATH`와 `MEDIA_DIR`를 지정한다.
2. SQLite backup과 미디어 백업을 복사하고 애플리케이션을 시작한다.
3. `/blog/`에서 `published` 글만 보이는지 확인한다.
4. `/api/admin/export`에서 revision/category 수를 확인한다.
5. 미디어 URL과 responsive 변형 URL을 열어 이미지가 표시되는지 확인한다.
6. 임시 데이터베이스와 미디어를 삭제한다.

복원 테스트는 분기마다 수행하고 날짜, 애플리케이션 버전, 백업 파일, 결과를 운영 기록에 남긴다.
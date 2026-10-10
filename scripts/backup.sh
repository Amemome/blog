#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "$0")/.."
set -a
. ./.env
set +a

DATABASE_PATH="${DATABASE_PATH:-./data/blog.sqlite}"
MEDIA_DIR="${MEDIA_DIR:-./data/media}"
BACKUP_DIR="${BACKUP_DIR:-./data/backups}"
BACKUP_REMOTE_DIR="${BACKUP_REMOTE_DIR:-}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
weekly_suffix=""
if [[ "$(date -u +%u)" == "7" ]]; then
	weekly_suffix="-weekly"
fi
mkdir -p "$BACKUP_DIR"
database_backup="$BACKUP_DIR/blog-${stamp}${weekly_suffix}.sqlite"
media_backup="$BACKUP_DIR/media-${stamp}${weekly_suffix}.tar.gz"

sqlite3 "$DATABASE_PATH" ".backup '$database_backup'"
if [[ -d "$MEDIA_DIR" ]]; then
	tar -czf "$media_backup" -C "$(dirname "$MEDIA_DIR")" "$(basename "$MEDIA_DIR")"
fi

if [[ -n "${BACKUP_GPG_RECIPIENT:-}" ]]; then
	gpg --batch --yes --trust-model always --recipient "$BACKUP_GPG_RECIPIENT" --encrypt --output "${database_backup}.gpg" "$database_backup"
	rm -f "$database_backup"
	if [[ -f "$media_backup" ]]; then
		gpg --batch --yes --trust-model always --recipient "$BACKUP_GPG_RECIPIENT" --encrypt --output "${media_backup}.gpg" "$media_backup"
		rm -f "$media_backup"
	fi
fi

if [[ -n "$BACKUP_REMOTE_DIR" ]]; then
	mkdir -p "$BACKUP_REMOTE_DIR"
	database_copy="$database_backup"
	if [[ -f "${database_backup}.gpg" ]]; then
		database_copy="${database_backup}.gpg"
	fi
	cp -f "$database_copy" "$BACKUP_REMOTE_DIR/"
	media_copy=""
	if [[ -f "$media_backup" ]]; then
		media_copy="$media_backup"
	elif [[ -f "${media_backup}.gpg" ]]; then
		media_copy="${media_backup}.gpg"
	fi
	if [[ -n "$media_copy" ]]; then
		cp -f "$media_copy" "$BACKUP_REMOTE_DIR/"
	fi
fi

find "$BACKUP_DIR" -type f -name 'blog-*.sqlite*' ! -name '*-weekly.sqlite*' -mtime +14 -delete
find "$BACKUP_DIR" -type f -name 'media-*.tar.gz*' ! -name '*-weekly.tar.gz*' -mtime +14 -delete
find "$BACKUP_DIR" -type f -name '*-weekly.sqlite*' -mtime +56 -delete
find "$BACKUP_DIR" -type f -name '*-weekly.tar.gz*' -mtime +56 -delete
printf 'Backup completed: %s\n' "$stamp"

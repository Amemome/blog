# Oracle Cloud 배포

이 앱은 Astro Node standalone SSR과 SQLite를 사용한다. Docker는 필수가 아니다. 작은 단일 VM에서는 Node를 systemd로 실행하고 Nginx를 reverse proxy로 두는 구성이 가장 단순하다.

## 구조

```text
Internet -> Nginx :80/:443 -> Astro Node 127.0.0.1:4321 -> SQLite/media
```

## VM 준비

Oracle Cloud Ubuntu VM에서 OCI VCN 보안 목록과 서브넷 보안 규칙에 `22`(관리자 IP만), `80`, `443`만 연다.

```bash
sudo apt update
sudo apt install -y nginx git curl build-essential sqlite3 certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo mkdir -p /var/www /var/lib/blog/{data,media,backups}
sudo chown -R "$USER":"$USER" /var/www /var/lib/blog
cd /var/www
git clone <repository-url> blog
cd blog
npm ci
```

`.env`에는 `/var/lib/blog` 아래의 영구 경로와 운영 도메인을 지정한다. `ADMIN_PASSWORD_HASH`를 사용하고 평문 `ADMIN_PASSWORD`는 운영에서 사용하지 않는다. `.env`를 만든 뒤 빌드해야 `PUBLIC_SITE_URL`이 올바른 canonical URL로 반영된다.

```bash
sudo chown ubuntu:ubuntu /var/www/blog/.env
sudo chmod 600 /var/www/blog/.env
npm run build
```

## Node 서비스와 Nginx

```bash
sudo cp deploy/blog.service /etc/systemd/system/blog.service
sudo cp deploy/nginx-blog.conf /etc/nginx/sites-available/blog
sudo ln -s /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now blog
sudo systemctl reload nginx
```

`deploy/nginx-blog.conf`의 `server_name`을 실제 도메인으로 바꾼다. DNS A 레코드가 VM 공인 IP를 가리킨 뒤 HTTPS를 붙인다.

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

## 백업 timer

`scripts/backup.sh`는 SQLite online backup과 media tar를 만들고, `BACKUP_GPG_RECIPIENT`가 있으면 두 파일을 GPG로 암호화한다. 일일 백업은 14일, 일요일 주간 백업은 8주 보관한다. `BACKUP_REMOTE_DIR`를 설정하면 생성된 SQLite와 media 백업을 별도 마운트나 외부 동기화 경로로 복제한다.

```bash
sudo cp deploy/blog-backup.service /etc/systemd/system/blog-backup.service
sudo cp deploy/blog-backup.timer /etc/systemd/system/blog-backup.timer
sudo systemctl daemon-reload
sudo systemctl enable --now blog-backup.timer
sudo systemctl start blog-backup.service
systemctl list-timers blog-backup.timer
```

암호화된 백업은 VM 외부 OCI Object Storage 등으로 복제해야 한다. VM 내부 백업만으로는 디스크 장애를 복구할 수 없다.

## 업데이트

```bash
cd /var/www/blog
git pull
npm ci
npm run build
sudo systemctl restart blog
curl -I https://example.com
```

Docker를 선택하려면 나중에 `Dockerfile`과 Compose를 추가하면 되지만, 현재 단일 VM 배포에는 필요하지 않다. Nginx는 프로젝트 파일에 포함되는 앱 코드가 아니라 Oracle VM 운영체제에 설치하는 외부 reverse proxy다.
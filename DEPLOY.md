# Deploying Sore Eyes to soreeyes.edgarbustos.art

Sore Eyes runs like the other apps on the droplet (foodie, test): a **Docker Compose project
in `/root/soreeyes`**, bound only to `127.0.0.1:3100`, with the **host nginx** proxying the
subdomain to it and **certbot** handling HTTPS. Nothing about benchy, blinksta, foodie or test changes.

```
browser ──https──▶ host nginx (soreeyes.edgarbustos.art) ──▶ 127.0.0.1:3100 ──▶ container "soreeyes" :3000
                                                                   │
                         /var/lib/soreeyes/data    → /data   (progress, backups, photos — read/write)
                         /var/lib/soreeyes/assets  → /assets (your extracted exercise pages — read-only)
```

Ports already used on the droplet: 3000, 3001, 3210, 5432, 8000. Sore Eyes uses **3100**.
The container is capped at 384 MB RAM and half a CPU so it can't crowd the other apps.
It idles at about 65 MB.

## 1. DNS (once)

Wherever `edgarbustos.art` DNS lives (the same place as `benchy`, `foodie` and `blinksta`):

| Type | Name | Value |
|---|---|---|
| `A` | `soreeyes` | the droplet's IPv4 (same as `foodie`) |

Check from anywhere: `dig +short soreeyes.edgarbustos.art`.

## 2. Server setup (once, as root on the droplet)

### Memory headroom for the build

`docker compose build` runs `next build`, which briefly needs about 1 GB. The droplet has 1.9 GB
with roughly 1.1 GB free. Check for swap:

```bash
swapon --show
```

If that prints nothing, add a 2 GB swap file so the build can't starve your other containers:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Code and folders

```bash
cd /root
git clone https://github.com/ad-nauseam-tendrills/soreeyes.git   # private: use your usual GitHub auth / deploy key
mkdir -p /var/lib/soreeyes/data /var/lib/soreeyes/assets
chown -R 1000:1000 /var/lib/soreeyes          # the container runs as the unprivileged "node" user (uid 1000)
chmod 750 /var/lib/soreeyes
```

There's no login and nothing secret to configure. The only setting is the time zone used for
"today" and review dates: `APP_TIMEZONE` in `docker-compose.yml` (default `America/Los_Angeles`).

### nginx + HTTPS

```bash
cp /root/soreeyes/deploy/nginx-soreeyes.conf /etc/nginx/sites-available/soreeyes
ln -s /etc/nginx/sites-available/soreeyes /etc/nginx/sites-enabled/soreeyes
nginx -t && systemctl reload nginx
certbot --nginx -d soreeyes.edgarbustos.art   # edits only this new server block
```

## 3. Exercise sheets (once, from your Mac)

The PDFs and rendered pages never go in git and never go on the server as PDFs. Extract only the
needed pages on your Mac and upload the result:

```bash
brew install poppler                          # provides pdftoppm
git clone https://github.com/ad-nauseam-tendrills/soreeyes.git && cd soreeyes
npm ci
npm run extract-assets -- \
  --aae ~/Books/An_Accurate_Eye.pdf \
  --sup ~/Books/An_Accurate_Eye-Supplement.pdf \
  --ceb ~/Books/A_Comparative_Eye-Course_Book.pdf \
  --cew ~/Books/A_Comparative_Eye-Workbook.pdf \
  --out ./private-assets                      # gitignored

rsync -av --delete ./private-assets/ root@<droplet>:/var/lib/soreeyes/assets/
ssh root@<droplet> 'chown -R 1000:1000 /var/lib/soreeyes/assets'
```

(`scp -r ./private-assets/* root@<droplet>:/var/lib/soreeyes/assets/` works too.) The script checks each
PDF's page count, so a different edition is caught. The app's **Data** page tells you if any page
file is missing.

## 4. First start and every update

```bash
cd /root/soreeyes
git pull                                      # skip on first start
docker compose up -d --build                  # runs the tests, builds, then swaps the container
docker image prune -f                         # tidy old image layers
docker compose ps                             # STATUS should become "healthy"
```

If a test fails, the build stops and the running version stays up. Then open
https://soreeyes.edgarbustos.art and check that the footer shows the new version (`src/lib/version.ts`).

Logs: `docker compose logs -f soreeyes`. Stop: `docker compose down` (data is untouched; it lives in `/var/lib/soreeyes`).

## 5. Backups

All progress lives in `/var/lib/soreeyes/data`:
- `state.json`: every attempt, note, error, printed-sheet record and setting
- `backups/`: the last 30 previous versions of `state.json`, one per change
- `photos/`: optional attempt photos

Use **Data → Export Progress** now and then, or from your Mac:
`ssh root@<droplet> 'tar -czf - -C /var/lib/soreeyes data' > soreeyes-data-$(date +%F).tgz`

## 6. When you're finished with the courses

```bash
cd /root/soreeyes && docker compose down && docker image rm soreeyes:latest
rm /etc/nginx/sites-enabled/soreeyes /etc/nginx/sites-available/soreeyes && systemctl reload nginx
certbot delete --cert-name soreeyes.edgarbustos.art
rm -rf /var/lib/soreeyes/assets /root/soreeyes   # keep or archive /var/lib/soreeyes/data
```

Then remove the `soreeyes` DNS record.

## Access

**There is no login.** Access is restricted to the owner's IP address by an ACL in front of the
site, which is what keeps the exercise pages and progress private. If that ACL is ever removed,
anyone who reaches `soreeyes.edgarbustos.art` could view and change everything. What also applies:

- The container port is bound to `127.0.0.1` only; the internet reaches it solely through nginx + HTTPS.
- No `/pdfs/`, `/exercises/` or `public/` directory exists; nginx serves no files itself.
- Asset ids are checked against an allow-list generated from the course data (130 pages). Pages are mounted read-only.
- The image contains no progress data, PDFs or extracted pages, and runs as a non-root user with `no-new-privileges`.
- `robots.txt` disallows everything, and every response carries `X-Robots-Tag: noindex`.
- Every change keeps a backup (`/var/lib/soreeyes/data/backups`), so an unwanted edit or import can be undone.

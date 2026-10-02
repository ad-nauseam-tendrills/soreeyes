# Deploying Sore Eyes to soreeyes.edgarbustos.art

Sore Eyes runs as a small Node process on the same DigitalOcean droplet as ArtBench,
behind its own nginx server block. **Nothing about the existing edgarbustos.art or
benchy sites changes.** As with ArtBench, you deploy by copying a file over `scp`.

```
browser ──https──▶ nginx (soreeyes.edgarbustos.art) ──▶ 127.0.0.1:3100 node server.js
                                                          │
                     /var/lib/soreeyes/data    (progress, backups, photos — read/write)
                     /var/lib/soreeyes/assets  (your extracted exercise pages — read only)
```

## 1. DNS (once)

At whoever hosts DNS for `edgarbustos.art` (DigitalOcean → Networking → Domains, or your registrar):

| Type | Host / Name | Value | TTL |
|---|---|---|---|
| `A` | `soreeyes` | your droplet's IPv4 (the same IP `benchy` uses) | 3600 |
| `AAAA` | `soreeyes` | droplet IPv6 — only if the droplet has IPv6 enabled | 3600 |

Check: `dig +short soreeyes.edgarbustos.art` returns the droplet IP.

## 2. Server setup (once, on the droplet)

```bash
# Node 20+ (skip if `node -v` already shows ≥ 20)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Service user and directories
sudo useradd --system --home /opt/soreeyes --shell /usr/sbin/nologin soreeyes
sudo mkdir -p /opt/soreeyes/releases /var/lib/soreeyes/data /var/lib/soreeyes/assets
sudo chown -R soreeyes:soreeyes /var/lib/soreeyes
sudo chmod 750 /var/lib/soreeyes /var/lib/soreeyes/data /var/lib/soreeyes/assets
```

### Secrets (`/etc/soreeyes.env`)

On your **Mac**, in `sore-eyes/`:

```bash
npm ci
npm run hash-password          # prompts for the password; prints OWNER_PASSWORD_HASH='scrypt:…'
openssl rand -base64 48        # → SESSION_SECRET
```

On the **droplet**, create the env file from `deploy/soreeyes.env.example`:

```bash
sudo nano /etc/soreeyes.env    # paste OWNER_PASSWORD_HASH and SESSION_SECRET; set APP_TIMEZONE
sudo chmod 600 /etc/soreeyes.env && sudo chown root:root /etc/soreeyes.env
```

Never commit these values. To change the password later, generate a new hash, edit the file and
`sudo systemctl restart soreeyes`. To sign out every device, change `SESSION_SECRET`.

### systemd + nginx

Copy `deploy/soreeyes.service` and `deploy/nginx-soreeyes.conf` to the droplet (`scp deploy/* droplet:/tmp/`), then:

```bash
sudo cp /tmp/soreeyes.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable soreeyes

sudo cp /tmp/nginx-soreeyes.conf /etc/nginx/sites-available/soreeyes
sudo ln -s /etc/nginx/sites-available/soreeyes /etc/nginx/sites-enabled/soreeyes
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d soreeyes.edgarbustos.art     # HTTPS; certbot edits only this server block
```

(If certbot isn't installed yet: `sudo apt install certbot python3-certbot-nginx`.)

## 3. Exercise sheets (once, from your Mac)

The original PDFs and the rendered pages never go in git and never go in the web root.
Extract only the needed pages **on your Mac** and upload the result. The PDFs themselves
don't need to be on the server.

```bash
brew install poppler           # provides pdftoppm
cd sore-eyes
npm run extract-assets -- \
  --aae "~/Books/An_Accurate_Eye.pdf" \
  --sup "~/Books/An_Accurate_Eye-Supplement.pdf" \
  --ceb "~/Books/A_Comparative_Eye-Course_Book.pdf" \
  --cew "~/Books/A_Comparative_Eye-Workbook.pdf" \
  --out ./private-assets       # gitignored

rsync -av --delete ./private-assets/ droplet:/tmp/soreeyes-assets/
ssh droplet 'sudo rsync -a --delete /tmp/soreeyes-assets/ /var/lib/soreeyes/assets/ && sudo chown -R soreeyes:soreeyes /var/lib/soreeyes/assets && rm -rf /tmp/soreeyes-assets'
```

(`scp -r ./private-assets droplet:/tmp/soreeyes-assets` works too.) The script checks each PDF's
page count, so a different edition is caught rather than silently mis-paged. The Data page in the
app tells you if any page file is missing.

## 4. Every deploy

On your Mac:

```bash
cd sore-eyes
# bump APP_VERSION in src/lib/version.ts
npm run package                # tests + build + dist/sore-eyes.tar.gz (refuses to include private files)
scp dist/sore-eyes.tar.gz droplet:/tmp/
```

On the droplet:

```bash
R=/opt/soreeyes/releases/$(date +%Y%m%d-%H%M%S)
sudo mkdir -p $R && sudo tar -xzf /tmp/sore-eyes.tar.gz -C $R
sudo ln -sfn $R /opt/soreeyes/current
sudo systemctl restart soreeyes
systemctl status soreeyes --no-pager | head -5
```

Then open https://soreeyes.edgarbustos.art and check that the footer shows the new version.
To roll back, point `current` at the previous release and restart.

> Build on a Mac and run on the droplet: the bundle is pure JavaScript (no native modules),
> so the same tarball runs on Linux.

## 5. Backups

All progress lives in `/var/lib/soreeyes/data`:
- `state.json` — every attempt, note, error, printed-sheet record and setting
- `backups/` — the last 30 previous versions of `state.json` (one per change)
- `photos/` — optional attempt photos

Use **Data → Export Progress** now and then, or copy the whole folder:
`ssh droplet 'sudo tar -czf - -C /var/lib/soreeyes data' > soreeyes-data-$(date +%F).tgz`

## 6. When you're finished with the courses

```bash
sudo systemctl disable --now soreeyes
sudo rm /etc/nginx/sites-enabled/soreeyes /etc/nginx/sites-available/soreeyes && sudo systemctl reload nginx
sudo rm -rf /opt/soreeyes /var/lib/soreeyes/assets      # keep or archive /var/lib/soreeyes/data
sudo certbot delete --cert-name soreeyes.edgarbustos.art
```

Then remove the `soreeyes` DNS record.

## Security checklist

- Every route — pages, `/api/asset/*`, `/api/print`, `/api/photo/*`, `/api/export` — requires the
  owner session cookie (HttpOnly, Secure, SameSite=Lax, 30 days). Only `/login` is public.
- There is no `/pdfs/`, `/exercises/` or `public/` directory. nginx serves no files itself.
- Asset ids are checked against an allow-list generated from the course data (130 pages).
- Login is throttled (5 failures → 10 minutes).
- `robots.txt` disallows everything, and every response carries `X-Robots-Tag: noindex`.

# Running ClipCraft 24/7

ClipCraft is a static web app. The production server in `scripts/serve.mjs` serves the built `dist` folder, handles SPA routing, and exposes a health check. Any process supervisor can keep it alive around the clock.

The app itself has no database. Email accounts and sessions are stored in the browser's `localStorage` (passwords are salted with PBKDF2-SHA256). Different browsers and devices therefore have separate local accounts.

## Quick start

```powershell
npm ci
npm run build
npm start
```

Open <http://localhost:8080>. The health check is <http://localhost:8080/healthz>.

Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8080` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |

## Option A: Docker Compose (recommended for an always-on server)

```bash
docker compose up -d --build
```

`restart: unless-stopped` brings the container back after crashes, reboots, and Docker daemon restarts. The health check is built into the image.

Update later with:

```bash
docker compose up -d --build
```

## Option B: PM2

```bash
npm install -g pm2
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

Enable startup on boot:

- **Linux/macOS:** run `pm2 startup`, then run the command PM2 prints.
- **Windows:** use the Task Scheduler option below. PM2's `pm2 startup` is unreliable on Windows.

Useful commands:

```bash
pm2 status
pm2 logs clipcraft
pm2 restart clipcraft
```

## Option C: systemd (Linux)

```bash
sudo useradd --system --home /opt/clipcraft --shell /usr/sbin/nologin clipcraft
sudo mkdir -p /opt/clipcraft
sudo chown -R clipcraft:clipcraft /opt/clipcraft
# copy the project into /opt/clipcraft, then:
cd /opt/clipcraft
sudo -u clipcraft npm ci
sudo -u clipcraft npm run build
sudo cp deploy/clipcraft.service /etc/systemd/system/clipcraft.service
sudo systemctl daemon-reload
sudo systemctl enable --now clipcraft
```

Check it:

```bash
systemctl status clipcraft
journalctl -u clipcraft -f
curl http://127.0.0.1:8080/healthz
```

The unit uses `Restart=always`, so systemd restarts the server if it exits or crashes.

## Option D: Windows Task Scheduler

### Boot-time service (recommended, requires Administrator)

Run PowerShell **as Administrator** from the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-windows-startup.ps1
```

This creates the task **ClipCraft Web Server**, runs it as `SYSTEM` at boot, starts it immediately, and restarts it after failures. The wrapper in `scripts/start-clipcraft.ps1` also restarts Node if it exits, and writes logs to `logs/clipcraft.log`.

### Per-user logon task (no Administrator rights)

If you cannot run PowerShell as Administrator, use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-windows-logon-task.ps1
```

This creates the same task for your user account. It starts when you sign in and restarts after failures, but it stops when you sign out.

Remove either task version with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-windows-startup.ps1
```

### Keep the PC awake

A sleeping PC cannot serve the app. For 24/7 use on Windows, connect the power adapter and disable sleep:

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
```

Also disable "Fast startup" if you want scheduled tasks to behave predictably across power cycles.

## Google sign-in

Email/password and guest sign-in work without any configuration. Google sign-in needs a Google OAuth **Web** client ID owned by you, because Google will not allow anonymous clients.

You can set it up from the app, with no rebuild:

1. Open <https://console.cloud.google.com/apis/credentials> and create an **OAuth client ID** of type **Web application**.
2. Add your site origin to **Authorized JavaScript origins** (for example `http://localhost:8080`). The app shows the exact origin and a copy button.
3. On the **OAuth consent screen**, choose **External** and add your Gmail address as a test user while the app is unverified.
4. On the sign-in screen click **Continue with Google**, paste the client ID into the setup panel, and click **Save and continue**.

The client ID is stored in this browser (`clipcraft-google-client-id-v1`) and can be replaced from the same panel.

Google's account picker is browser-mediated (FedCM). Chrome and Edge give the smoothest experience; if the picker is blocked, allow third-party sign-in for the site or use email sign-in. A client ID only works for origins registered on it, so add a new origin when you change domains or ports.

For a build-wide default, create `.env` in the project root and rebuild, because Vite embeds the value at build time:

```dotenv
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

A client ID saved from the in-app panel takes priority over the build value.

ClipCraft verifies the Google credential's audience and expiry, and stores only your name, email, and avatar in `localStorage`. It never receives your Google password.

## HTTPS reverse proxy

Put Caddy or Nginx in front of the app for TLS. Caddy example:

```caddyfile
clipcraft.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:8080
}
```

Nginx example:

```nginx
server {
  listen 443 ssl http2;
  server_name clipcraft.example.com;

  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

The production server already adds the `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers required by the browser AI workers. Do not strip them in the proxy.

## Health checks and uptime

`GET /healthz` returns:

```json
{
  "status": "ok",
  "service": "clipcraft-web",
  "startedAt": "2026-11-10T08:00:00.000Z",
  "uptimeSeconds": 42,
  "now": "2026-11-10T08:00:42.000Z"
}
```

Use it with Docker, Kubernetes, Uptime Kuma, Pingdom, or any external monitor.

No configuration can guarantee 24/7 uptime on a machine that sleeps, loses power, or loses connectivity. Use an always-on host (VPS, home server, or a cloud container), keep the process supervisor enabled, and monitor `/healthz` from outside the machine.

## Optional: native host features

`npm start` serves the web app only. Features that rely on the local Fastify host (project files and some on-device processing) use the separate host service:

```powershell
npm run host
```

Run it under the same supervisor if you need those features. The static server and the host service can run side by side.

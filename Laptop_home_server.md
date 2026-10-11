# Laptop Linux Home Server: Cloudflare Tunnel, OTel Observability & GitHub Actions Deployments

Oct 2, 2026 · @Roman

## 1. Architecture and why Docker Compose

Use Ubuntu Server LTS + Docker Compose + Traefik behind a Cloudflare Tunnel: the laptop opens no inbound ports, every subdomain is one label on a container, and GitHub Actions deploys by pulling a new image tag.

How a request flows: a browser hits `app.example.com` at Cloudflare. Cloudflare sends it down the tunnel (an outbound connection the `cloudflared` container keeps open) to Traefik. Traefik reads the Host header and forwards it to the right container. Telemetry goes the other way inside the server: apps send OTLP to the OpenTelemetry Collector, which fans out to Prometheus (metrics), Loki (logs) and Tempo (traces). Grafana reads all three.

&#91;embedded content: home server architecture · traffic, telemetry and deploy paths\]

The runner restarts app containers after each pull; Traefik also serves Grafana, behind Cloudflare Access.

Throughout this guide, replace `example.com` with your domain and `homeserver` with the laptop's hostname.

| Option | Setup effort | Upkeep | Verdict |
| --- | --- | --- | --- |
| Docker Compose + Traefik (this guide) | Medium, one afternoon | Low: everything is files in git, upgrades are a tag bump | Recommended: best balance of control and simplicity |
| Coolify or Dokploy (self-hosted PaaS UI) | Low, mostly clicking | Low, but you depend on the tool's own upgrades | Good if you prefer a UI; still Docker underneath, and you still add the observability stack yourself |
| k3s (lightweight Kubernetes) | High | Medium to high | Overkill for one laptop unless you want to learn Kubernetes |
| Bare metal (systemd services, nginx, dotnet runtime on the host) | Medium | High: runtime versions, conflicts, manual rollbacks | Avoid: every app pollutes the host |

Why containers win here: React builds to static files served by nginx in a container, .NET ships as a container with its own runtime, and both deploy the same way. Rolling back is changing one tag. Reinstalling the laptop means restoring a folder and running `docker compose up -d`.

## 2. Install Linux on the laptop

Install Ubuntu Server LTS (24.04 or newer), headless, on Ethernet; then stop the laptop from sleeping when the lid closes.

### 2.1 Prepare

1. Back up anything on the laptop; the disk will be wiped.
2. Download the Ubuntu Server LTS ISO from ubuntu.com/download/server.
3. Write it to a USB stick with balenaEtcher or Rufus (on Linux: `sudo dd if=ubuntu.iso of=/dev/sdX bs=4M status=progress`).
4. In the laptop's BIOS/UEFI: enable "Power on after AC loss" if offered, set boot from USB first. Secure Boot can stay on.
5. Plug in Ethernet. Wi-Fi works but drops more often on servers.

### 2.2 Run the installer

1. Choose "Ubuntu Server" (not minimized, so you have common tools).
2. Network: accept DHCP. Later, reserve the laptop's IP in your router's DHCP settings so it never changes.
3. Storage: "Use an entire disk" with LVM. Note the installer may give the root volume only part of the disk (fixed below).
4. Profile: your name, hostname `homeserver`, a username and a strong password.
5. SSH: tick "Install OpenSSH server" and "Import SSH key" from GitHub if your public key is there.
6. Featured snaps: select nothing. Do not pick the Docker snap; Docker comes from Docker's own repo in section 4.
7. Reboot, remove the USB stick, and log in over SSH from your PC: `ssh you@homeserver.local` (or the IP).

### 2.3 First boot basics

```bash
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y curl git htop ncdu jq lm-sensors
sudo timedatectl set-timezone <Region/City>

# Give the root volume the whole disk (safe to run even if already full size)
sudo lvextend -r -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
df -h /
```

### 2.4 Laptop-specific tweaks

Keep it running with the lid closed:

```bash
sudo mkdir -p /etc/systemd/logind.conf.d
sudo tee /etc/systemd/logind.conf.d/lid.conf <<'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
HandleLidSwitchDocked=ignore
EOF
sudo systemctl restart systemd-logind
```

Never suspend or hibernate:

```bash
sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target
```

Turn the screen off after 60 seconds (saves power and the panel): edit `/etc/default/grub`, add `consoleblank=60` to `GRUB_CMDLINE_LINUX_DEFAULT`, then run `sudo update-grub`.

Protect the battery, which now works as a free UPS. Keeping it at 100% for months wears it and can make it swell. If your laptop supports charge thresholds (most ThinkPads, many Dell, ASUS and Lenovo models):

```bash
sudo apt install -y tlp
sudo tee /etc/tlp.d/01-battery.conf <<'EOF'
START_CHARGE_THRESH_BAT0=70
STOP_CHARGE_THRESH_BAT0=80
EOF
sudo systemctl enable --now tlp
sudo tlp-stat -b   # check the thresholds took effect
```

If thresholds are not supported, check the battery for swelling every few months; some people remove it and run on AC only.

Watch temperatures with `sensors`. Keep the vents clear; a closed laptop on a shelf runs hotter than on a desk.

## 3. Base hardening

SSH with keys only, a firewall that allows SSH from your home network only, and automatic security updates. Because the tunnel is outbound, nothing else needs to be reachable.

### 3.1 SSH keys only

First confirm you can log in with your key (`ssh you@homeserver` without a password prompt). If not, run `ssh-copy-id you@homeserver` from your PC. Then:

```bash
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
EOF
sudo systemctl restart ssh
```

Keep your current session open and test a new SSH login in a second terminal before closing it.

### 3.2 Firewall

Replace `192.168.1.0/24` with your LAN range:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from 192.168.1.0/24 to any port 22 proto tcp
sudo ufw enable
sudo ufw status verbose
```

Important: Docker writes its own iptables rules and bypasses ufw for published ports. This guide publishes no container ports to the outside; anything you publish for local debugging binds to `127.0.0.1` only.

### 3.3 Automatic security updates

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades   # answer Yes
sudo tee /etc/apt/apt.conf.d/52auto-reboot <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
EOF
```

All containers in this guide use `restart: unless-stopped`, so they come back after the nightly reboot.

### 3.4 Optional extras

- `sudo apt install -y fail2ban`: bans IPs after failed SSH logins. Low value while SSH is LAN-only, useful if you ever expose it.
- Remote SSH from outside home: add a tunnel hostname `ssh.example.com` → `ssh://host.docker.internal:22 (add extra_hosts: host.docker.internal:host-gateway to the cloudflared service)` protected by Cloudflare Access, or install Tailscale. Both avoid opening port 22 on your router.

## 4. Install Docker and lay out the folders

Install Docker Engine and the Compose plugin from Docker's official apt repo, cap log sizes, and create two shared networks that every stack joins.

### 4.1 Docker Engine + Compose

```bash
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER   # log out and back in afterwards
docker run --rm hello-world
```

Membership in the `docker` group is equivalent to root. Only add accounts you trust.

### 4.2 Cap container logs

Without this, chatty containers slowly fill the disk:

```bash
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "local",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
sudo systemctl restart docker
```

### 4.3 Shared networks

```bash
docker network create proxy   # Traefik + cloudflared + every web app
docker network create otel    # OTel Collector + every app that sends telemetry
```

### 4.4 Directory layout

```bash
sudo mkdir -p /srv/infra/edge /srv/infra/observability /srv/apps
sudo chown -R $USER:$USER /srv
```

```
/srv
├── infra/                 # put this folder in a private git repo
│   ├── edge/              # cloudflared + Traefik     (sections 5–6)
│   └── observability/     # Collector, Prometheus, Loki, Tempo, Grafana (section 7)
└── apps/
    └── <app-name>/        # compose.yml + .env, written by GitHub Actions (section 10)
```

Secrets live in `.env` files next to each `compose.yml`. Add `.env` to `.gitignore` and keep a copy in your password manager.

## 5. Cloudflare: domain and tunnel

Create one dashboard-managed tunnel and point both `example.com` and `*.example.com` at Traefik; after that, new subdomains need no Cloudflare changes at all.

### 5.1 Put the domain on Cloudflare

1. Sign up at dash.cloudflare.com (the free plan is enough) and add your domain.
2. At your registrar, replace the nameservers with the two Cloudflare gives you. Wait until the domain shows "Active" (minutes to a few hours).
3. SSL/TLS → Overview: set the mode to Full. TLS is terminated at Cloudflare; the tunnel itself is encrypted, so Traefik can serve plain HTTP inside.

Free Universal SSL covers `example.com` and one level of subdomain (`app.example.com`), not deeper ones like `a.b.example.com`. Keep subdomains one level deep.

### 5.2 Create the tunnel

1. Open the Zero Trust dashboard (one.dash.cloudflare.com) → Networks → Tunnels → Create a tunnel.
2. Connector type: Cloudflared. Name it `homeserver`.
3. On the install screen choose Docker and copy only the token (the long string after `--token`). You will paste it into `/srv/infra/edge/.env` in section 6. Do not run the shown command.

### 5.3 Route hostnames to Traefik

In the tunnel's Public Hostname tab add two entries:

| Subdomain | Domain | Service type | URL |
| --- | --- | --- | --- |
| (empty) | example.com | HTTP | traefik:80 |
| `*` | example.com | HTTP | traefik:80 |

`traefik` resolves because cloudflared and Traefik share the `proxy` Docker network.

### 5.4 DNS records

The dashboard creates the apex record automatically. Check DNS → Records and add the wildcard if it is missing:

| Type | Name | Target | Proxy |
| --- | --- | --- | --- |
| CNAME | `*` | `<tunnel-id>.cfargotunnel.com` | Proxied (orange cloud) |

The tunnel ID is shown on the tunnel's overview page. Any explicit record (for example your email's MX) still wins over the wildcard.

## 6. Edge stack: cloudflared + Traefik

Traefik watches Docker and builds a route for every container that carries `traefik.enable=true` labels, so adding a subdomain is a label, not a config edit.

`/srv/infra/edge/.env`:

```bash
TUNNEL_TOKEN=paste-the-token-from-5.2
DOMAIN=example.com
```

`/srv/infra/edge/compose.yml`:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --no-autoupdate run
    environment:
      TUNNEL_TOKEN: ${TUNNEL_TOKEN}
    networks: [proxy]
    restart: unless-stopped

  traefik:
    image: traefik:v3.6
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=proxy
      - --entrypoints.web.address=:80
      # trust X-Forwarded-* headers coming from cloudflared on the Docker network
      - --entrypoints.web.forwardedHeaders.trustedIPs=172.16.0.0/12
      - --api.dashboard=true
      - --accesslog=true
      - --ping=true
    ports:
      - "127.0.0.1:8080:80"   # local debugging only: curl -H 'Host: app.example.com' localhost:8080
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks: [proxy]
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.http.routers.traefik.rule=Host(`traefik.${DOMAIN}`)
      - traefik.http.routers.traefik.entrypoints=web
      - traefik.http.routers.traefik.service=api@internal

  whoami:   # test container; delete once things work
    image: traefik/whoami
    networks: [proxy]
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.http.routers.whoami.rule=Host(`whoami.${DOMAIN}`)
      - traefik.http.routers.whoami.entrypoints=web

networks:
  proxy:
    external: true
```

Start it and test:

```bash
cd /srv/infra/edge
docker compose up -d
docker compose logs cloudflared | grep -i registered   # expect 4 "Registered tunnel connection" lines
```

Open `https://whoami.example.com`: you should see request headers printed back. The tunnel page in Zero Trust should show the connector as Healthy.

The Traefik dashboard at `traefik.example.com` is public until you finish section 8. Do section 8 before leaving it running, or comment out its labels for now.

Pin `cloudflared` to a specific version once it works (tags look like `2025.x.y`); `latest` is fine for the first test.

## 7. Observability stack: OTel Collector + Grafana LGTM

Apps send all signals over OTLP to one Collector; it writes metrics to Prometheus, logs to Loki and traces to Tempo, and Grafana shows all three with click-through from a trace to its logs. Everything is free and open source.

| Component | Role | Port (internal only) |
| --- | --- | --- |
| OpenTelemetry Collector (contrib) | Receives OTLP, batches, also collects host CPU/RAM/disk | 4317 gRPC, 4318 HTTP |
| Prometheus | Metrics store (native OTLP receiver) | 9090 |
| Loki | Log store (native OTLP endpoint) | 3100 |
| Tempo | Trace store | 3200, 4317 |
| Grafana | Dashboards and explore UI at `grafana.example.com` | 3000 |

Shortcut: if you want the quickest possible start, the single `grafana/otel-lgtm` image bundles all five. It is built for development, so the split setup below is easier to tune, upgrade and keep data for.

Versions below were current when written; check each project's releases page and bump them.

### 7.1 Files

```
/srv/infra/observability/
├── compose.yml
├── .env
├── otel-collector.yaml
├── prometheus.yml
├── loki.yaml
├── tempo.yaml
└── grafana/provisioning/datasources/datasources.yaml
```

`.env`:

```bash
DOMAIN=example.com
GF_ADMIN_PASSWORD=change-me-long-random
```

### 7.2 compose.yml

```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.130.0
    command: ["--config=/etc/otelcol/config.yaml"]
    volumes:
      - ./otel-collector.yaml:/etc/otelcol/config.yaml:ro
      - /:/hostfs:ro            # for host metrics
    networks: [otel, backend]
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:v3.5.0
    command:
      - --config.file=/etc/prometheus/prometheus.yml
      - --storage.tsdb.retention.time=30d
      - --web.enable-otlp-receiver
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks: [backend]
    restart: unless-stopped

  loki:
    image: grafana/loki:3.5.0
    command: ["-config.file=/etc/loki/loki.yaml"]
    volumes:
      - ./loki.yaml:/etc/loki/loki.yaml:ro
      - loki-data:/loki
    networks: [backend]
    restart: unless-stopped

  tempo-init:   # Tempo runs as uid 10001; fix volume ownership once
    image: busybox
    command: ["chown", "-R", "10001:10001", "/var/tempo"]
    volumes: [tempo-data:/var/tempo]

  tempo:
    image: grafana/tempo:2.8.0
    command: ["-config.file=/etc/tempo/tempo.yaml"]
    depends_on:
      tempo-init:
        condition: service_completed_successfully
    volumes:
      - ./tempo.yaml:/etc/tempo/tempo.yaml:ro
      - tempo-data:/var/tempo
    networks: [backend]
    restart: unless-stopped

  grafana:
    image: grafana/grafana:12.1.0
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GF_ADMIN_PASSWORD}
      GF_SERVER_ROOT_URL: https://grafana.${DOMAIN}
      GF_USERS_ALLOW_SIGN_UP: "false"
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - grafana-data:/var/lib/grafana
    networks: [backend, proxy]
    restart: unless-stopped
    labels:
      - traefik.enable=true
      - traefik.http.routers.grafana.rule=Host(`grafana.${DOMAIN}`)
      - traefik.http.routers.grafana.entrypoints=web
      - traefik.http.services.grafana.loadbalancer.server.port=3000

volumes:
  prometheus-data:
  loki-data:
  tempo-data:
  grafana-data:

networks:
  backend: {}             # private to this stack
  otel:
    external: true
  proxy:
    external: true
```

### 7.3 otel-collector.yaml

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  hostmetrics:
    root_path: /hostfs
    collection_interval: 30s
    scrapers:
      cpu: {}
      memory: {}
      load: {}
      disk: {}
      filesystem: {}
      network: {}

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 400
  resourcedetection:
    detectors: [env, system]
  batch: {}

exporters:
  otlphttp/prometheus:
    endpoint: http://prometheus:9090/api/v1/otlp
  otlphttp/loki:
    endpoint: http://loki:3100/otlp
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [otlp, hostmetrics]
      processors: [memory_limiter, resourcedetection, batch]
      exporters: [otlphttp/prometheus]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/loki]
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/tempo]
```

### 7.4 prometheus.yml

```yaml
global:
  scrape_interval: 30s

otlp:
  # copy these resource attributes onto every metric as labels
  promote_resource_attributes:
    - service.name
    - service.namespace
    - service.version
    - deployment.environment
    - host.name

scrape_configs:
  - job_name: prometheus
    static_configs:
      - targets: ["localhost:9090"]
```

### 7.5 loki.yaml

```yaml
auth_enabled: false
server:
  http_listen_port: 3100
common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory
schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
limits_config:
  retention_period: 336h          # 14 days
  allow_structured_metadata: true # required for OTLP logs
compactor:
  working_directory: /loki/compactor
  retention_enabled: true
  delete_request_store: filesystem
```

### 7.6 tempo.yaml

```yaml
server:
  http_listen_port: 3200
distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317
storage:
  trace:
    backend: local
    local:
      path: /var/tempo/traces
    wal:
      path: /var/tempo/wal
compactor:
  compaction:
    block_retention: 168h   # 7 days
```

### 7.7 Grafana data sources

`grafana/provisioning/datasources/datasources.yaml` wires the three stores and the trace → logs and logs → trace links:

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    uid: prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    uid: loki
    type: loki
    url: http://loki:3100
    jsonData:
      derivedFields:
        - name: TraceID
          matcherType: label
          matcherRegex: trace_id
          datasourceUid: tempo
          url: "$${__value.raw}"

  - name: Tempo
    uid: tempo
    type: tempo
    url: http://tempo:3200
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki
        filterByTraceID: true
        spanStartTimeShift: "-5m"
        spanEndTimeShift: "5m"
      serviceMap:
        datasourceUid: prometheus
```

### 7.8 Start and verify

```bash
cd /srv/infra/observability
docker compose up -d
docker compose ps                 # all running, tempo-init exited 0
docker compose logs otel-collector | tail
```

Log in at `https://grafana.example.com` as `admin`. In Explore → Prometheus, query `system_cpu_time_seconds_total`; data there means the Collector → Prometheus path works. Apps from section 9 will fill Loki and Tempo.

Useful starter dashboards (Dashboards → New → Import by ID from grafana.com): search "OpenTelemetry host metrics" and "ASP.NET Core OpenTelemetry"; the official .NET team dashboards are published there.

Optional, telemetry from outside the server: add a router `otlp.example.com` → `otel-collector:4318` (put the Collector on the `proxy` network too) and require a token with the Collector's `bearertokenauth` extension, or a Cloudflare Access service token. Skip this until you need it.

## 8. Lock admin UIs behind Cloudflare Access

Put `grafana`, `traefik` (and later anything private) behind a Cloudflare login, so strangers never reach the app's own login page. Access is free for up to 50 users.

1. Zero Trust dashboard → Settings → Authentication: the "One-time PIN" login method (code sent by email) is available by default. Optionally add GitHub or Google as a login method.
2. Access → Applications → Add an application → Self-hosted.
3. Name: `Admin`. Add public hostnames `grafana.example.com` and `traefik.example.com` (one application can cover several).
4. Add a policy: Action Allow, Include → Emails → your address(es).
5. Save. Open `https://grafana.example.com` in a private window: you should see the Cloudflare login first, then Grafana's.

Keep the Grafana password anyway; Access is the outer door, Grafana's login the inner one.

To make a whole app private (a family dashboard, a staging site), add its hostname to the same application. Public sites need no Access entry.

## 9. Sample app: React frontend + .NET API

One repo, two images: React is built to static files and served by nginx; the .NET API runs on the ASP.NET runtime image and sends traces, metrics and logs to the Collector. Both live on `shop.example.com`, with `/api` routed to .NET, so the browser needs no CORS setup.

### 9.1 Repo layout

```
shop/
├── web/                 # React (Vite)
│   ├── Dockerfile
│   └── nginx.conf
├── api/                 # ASP.NET Core
│   ├── Api.csproj
│   ├── Program.cs
│   └── Dockerfile
├── deploy/
│   └── compose.yml      # what runs on the server
└── .github/workflows/deploy.yml
```

Add a `.dockerignore` in `web/` (`node_modules`, `dist`) and in `api/` (`bin`, `obj`).

### 9.2 React: web/Dockerfile

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

`web/nginx.conf` (client-side routing + long caching for hashed assets):

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;

  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache";
  }
}
```

In React, call the API with relative URLs: `fetch('/api/hello')`.

### 9.3 .NET: add OpenTelemetry

```bash
cd api
dotnet add package OpenTelemetry.Extensions.Hosting
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
dotnet add package OpenTelemetry.Instrumentation.AspNetCore
dotnet add package OpenTelemetry.Instrumentation.Http
dotnet add package OpenTelemetry.Instrumentation.Runtime
```

`api/Program.cs`:

```csharp
using OpenTelemetry;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// Endpoint and service name come from OTEL_* environment variables (see compose.yml)
builder.Services.AddOpenTelemetry()
    .WithTracing(t => t
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation())
    .WithMetrics(m => m
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddRuntimeInstrumentation())
    .WithLogging()
    .UseOtlpExporter();

builder.Services.AddHealthChecks();

var app = builder.Build();

app.MapHealthChecks("/api/health");
app.MapGet("/api/hello", (ILogger<Program> log) =>
{
    log.LogInformation("Hello endpoint called");
    return new { message = "Hello from .NET" };
});

app.Run();
```

Every `ILogger` line now lands in Loki with the trace ID attached, so in Grafana you can jump from a slow trace to its logs.

### 9.4 .NET: api/Dockerfile

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY *.csproj ./
RUN dotnet restore
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
USER $APP_UID
EXPOSE 8080
ENTRYPOINT ["dotnet", "Api.dll"]
```

ASP.NET images listen on port 8080 and run as a non-root user by default. Use `8.0` or `9.0` tags if your project targets those.

### 9.5 deploy/compose.yml

Replace `youruser` with your GitHub user or org (lowercase):

```yaml
name: shop
services:
  web:
    image: ghcr.io/youruser/shop-web:${TAG:-latest}
    restart: unless-stopped
    networks: [proxy]
    labels:
      - traefik.enable=true
      - traefik.http.routers.shop-web.rule=Host(`shop.example.com`)
      - traefik.http.routers.shop-web.entrypoints=web
      - traefik.http.services.shop-web.loadbalancer.server.port=80

  api:
    image: ghcr.io/youruser/shop-api:${TAG:-latest}
    restart: unless-stopped
    environment:
      OTEL_SERVICE_NAME: shop-api
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
      OTEL_RESOURCE_ATTRIBUTES: deployment.environment=prod
    networks: [proxy, otel]
    labels:
      - traefik.enable=true
      - traefik.http.routers.shop-api.rule=Host(`shop.example.com`) && PathPrefix(`/api`)
      - traefik.http.routers.shop-api.entrypoints=web
      - traefik.http.services.shop-api.loadbalancer.server.port=8080

networks:
  proxy:
    external: true
  otel:
    external: true
```

Traefik gives longer rules higher priority, so `/api/*` goes to .NET and everything else to React. Router names (`shop-web`, `shop-api`) must be unique across all stacks on the server.

To give the API its own subdomain instead, change its rule to ``Host(`api.example.com`)`` and enable CORS in .NET for `shop.example.com`.

Frontend telemetry (optional): Grafana Faro or the OpenTelemetry JS web SDK can send browser traces and errors, which needs the public OTLP endpoint from the end of section 7.

## 10. Deploy with GitHub Actions

Build images on GitHub's runners, push them to GitHub Container Registry (GHCR), then let a self-hosted runner on the laptop pull and restart them. The runner connects out to GitHub, so the server still needs no open ports and GitHub never needs SSH access.

| Deploy option | How it reaches the server | Verdict |
| --- | --- | --- |
| Self-hosted runner on the laptop (this guide) | Runner polls GitHub over outbound HTTPS | Simplest and safest for private repos |
| SSH through Cloudflare Access | Workflow runs `cloudflared access ssh` with a service token | Works, more secrets to manage |
| Watchtower / pull-based | Server polls GHCR for new `latest` images | No CI step, but no control over when or what deploys |

Use the self-hosted runner only with private repos: on a public repo, a pull request from a stranger could run code on your server.

### 10.1 Create a deploy user and install the runner

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo chown -R deploy:deploy /srv/apps
sudo -iu deploy
```

In GitHub: repo → Settings → Actions → Runners → New self-hosted runner → Linux x64. Run the download and `./config.sh` commands it shows, as `deploy`, in `~/actions-runner`. When asked for labels, add `homeserver`. Then install it as a service:

```bash
exit                                  # back to your admin user
cd /home/deploy/actions-runner
sudo ./svc.sh install deploy
sudo ./svc.sh start
```

The runner should show as Idle in GitHub. A personal account needs one runner per repo (repeat in a new folder such as `~/actions-runner-blog`); a GitHub organization can share one runner across all its repos.

### 10.2 Repo settings

1. Settings → Actions → General → Workflow permissions: Read and write.
2. Settings → Environments → New environment `production` (optional: require your approval before each deploy).
3. After the first push, open each package (your profile → Packages) and keep it private; the workflow token can still pull it.

### 10.3 .github/workflows/deploy.yml

```yaml
name: build-and-deploy

on:
  push:
    branches: [main]
  workflow_dispatch: {}

permissions:
  contents: read
  packages: write

concurrency:
  group: deploy-production
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - name: web
            context: ./web
          - name: api
            context: ./api
    steps:
      - uses: actions/checkout@v5

      - name: Lowercase owner for image names
        run: echo "OWNER=${GITHUB_REPOSITORY_OWNER,,}" >> $GITHUB_ENV

      - uses: docker/setup-buildx-action@v3

      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/build-push-action@v6
        with:
          context: ${{ matrix.context }}
          push: true
          platforms: linux/amd64
          tags: |
            ghcr.io/${{ env.OWNER }}/shop-${{ matrix.name }}:${{ github.sha }}
            ghcr.io/${{ env.OWNER }}/shop-${{ matrix.name }}:latest
          cache-from: type=gha,scope=${{ matrix.name }}
          cache-to: type=gha,mode=max,scope=${{ matrix.name }}

  deploy:
    needs: build
    runs-on: [self-hosted, homeserver]
    environment: production
    steps:
      - uses: actions/checkout@v5
        with:
          sparse-checkout: deploy

      - name: Log in to GHCR
        run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Deploy
        run: |
          set -euo pipefail
          APP_DIR=/srv/apps/shop
          mkdir -p "$APP_DIR"
          cp deploy/compose.yml "$APP_DIR/compose.yml"
          echo "TAG=${{ github.sha }}" > "$APP_DIR/.env"   # pins the exact build
          cd "$APP_DIR"
          docker compose pull
          docker compose up -d --remove-orphans

      - name: Smoke test
        run: |
          sleep 5
          curl -fsS -H 'Host: shop.example.com' http://127.0.0.1:8080/api/health

      - name: Clean up old images
        if: always()
        run: docker image prune -af --filter "until=168h"
```

Change the `platforms` value to `linux/arm64` only if the laptop is ARM (rare). If the laptop's architecture differs from GitHub's runner, building still works through buildx emulation, just slower.

The smoke test uses the `127.0.0.1:8080` port Traefik publishes for local checks (section 6).

### 10.4 The deployment procedure, day to day

1. Push to `main` (or merge a pull request).
2. GitHub builds both images in parallel and pushes them tagged with the commit SHA.
3. The `production` environment waits for your approval if you enabled it.
4. The laptop's runner copies `compose.yml`, writes the new `TAG`, pulls and restarts only the containers whose image changed.
5. The smoke test calls `/api/health`; a failure marks the run red.
6. Check `https://shop.example.com` and the service in Grafana.

Rollback: re-run an older successful workflow run from the Actions tab, or on the server `cd /srv/apps/shop`, set `TAG=<older-sha>` in `.env`, and run `docker compose up -d`.

## 11. Adding apps, backups and upkeep

A new app takes five steps and zero Cloudflare clicks; upkeep is a monthly 15-minute routine.

### 11.1 Checklist for each new app

1. Add a `Dockerfile` (copy 9.2 for React, 9.4 for .NET).
2. Add `deploy/compose.yml` with a unique project `name:`, unique router names and `Host(`newapp.example.com`)`; join `proxy`, and `otel` if it sends telemetry.
3. Copy the workflow from 10.3, changing image names and `APP_DIR`.
4. Register a self-hosted runner for the repo (10.1), unless you use an org runner.
5. Push to `main`. The wildcard DNS and tunnel route make `newapp.example.com` live immediately; add it to Cloudflare Access (section 8) if it should be private.

### 11.2 Backups

What to keep, and how:

| What | Where | How |
| --- | --- | --- |
| Infra configs | `/srv/infra` | Private git repo; `.env` files in your password manager |
| App configs | Each app's repo | Already in git; the server copy is rewritten on every deploy |
| Grafana dashboards and users | `grafana-data` volume | Nightly volume backup (below), or export dashboards to git as JSON |
| App databases (if you add any) | Their volumes | Nightly dump plus volume backup |
| Metrics, logs, traces | Prometheus, Loki, Tempo volumes | Usually not worth backing up; they expire after 7 to 30 days anyway |

A simple nightly backup with restic to an external USB disk or a cloud bucket (Backblaze B2, Cloudflare R2):

```bash
sudo apt install -y restic
# one-time: restic -r /mnt/backup/restic init
# /etc/cron.daily/backup-homeserver
#!/bin/sh
export RESTIC_PASSWORD_FILE=/root/.restic-pass
restic -r /mnt/backup/restic backup /srv /var/lib/docker/volumes/observability_grafana-data
restic -r /mnt/backup/restic forget --keep-daily 7 --keep-weekly 4 --prune
```

Test a restore once; an untested backup is a hope, not a backup.

### 11.3 Monthly upkeep

- [ ] Bump image tags in `/srv/infra/*/compose.yml` (read release notes for Loki, Tempo and Traefik major versions), then `docker compose pull && docker compose up -d` in each folder.
- [ ] `df -h /` and `docker system df`; prune with `docker system prune` if space runs low.
- [ ] Check `sensors` and the battery state (`upower -i $(upower -e | grep BAT)`).
- [ ] Glance at Zero Trust → Tunnels (Healthy) and the GitHub runner (Idle).
- [ ] Major Ubuntu release upgrades: wait a few months after release, back up, then `sudo do-release-upgrade`.

### 11.4 Troubleshooting

| Symptom | Likely cause | Check |
| --- | --- | --- |
| Cloudflare error 1033 | Tunnel down | `docker compose logs cloudflared` in `/srv/infra/edge`; token correct? |
| Cloudflare 502 / bad gateway | Tunnel up, Traefik unreachable | Is `traefik` running and on the `proxy` network? Public hostname URL is `traefik:80`? |
| Traefik 404 for a subdomain | No router matches | Container has `traefik.enable=true`, is on `proxy`, Host rule spelled right; `docker logs traefik` |
| Gateway timeout to one app | Wrong internal port | `loadbalancer.server.port` matches what the app listens on (80 nginx, 8080 .NET) |
| SSL error on `a.b.example.com` | Universal SSL covers one level only | Use `a-b.example.com` instead |
| No traces or logs in Grafana | App not reaching Collector | App on `otel` network? `OTEL_EXPORTER_OTLP_ENDPOINT` set? `docker compose logs otel-collector` |
| Deploy job stuck "Waiting for a runner" | Runner offline or label mismatch | `sudo systemctl status 'actions.runner.*'`; labels include `homeserver` |
| `docker compose pull` denied | GHCR auth | Workflow permission `packages: write`; package linked to the repo |
| Server gone after closing lid | Suspend still active | Recheck section 2.4; `systemctl status sleep.target` should say masked |

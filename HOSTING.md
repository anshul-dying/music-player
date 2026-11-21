# GaneGan — $0 Free Tier Hosting & Cloud Migration Guide

Comprehensive playbook for hosting GaneGan at **$0/month** initially, and migrating to **AWS** when scaling.

---

## 1. Why $0 Hosting Survives High Traffic

Traditional music/media players proxy streams through their servers, racking up massive bandwidth and proxy egress bills:
- 1,000 listeners @ 160 kbps = ~72 GB/hour = **\$500–\$2,000+/month** bandwidth bill.

**Our Client-Side Streaming Architecture:**
- Browser requests metadata directly from InnerTube (or lightweight dev-proxy).
- Audio bytes stream **directly from `googlevideo.com` CDN to user ears**.
- **Our server media egress = 0 bytes**.
- Backend handles only tiny JSON (~2 KB/request): auth, playlist CRUD, and lyrics.
- 100,000 listeners cost our backend **the exact same as 10 listeners**.

---

## 2. The $0 Tier Stack (Initial Launch)

| Component | Free Provider | Free Tier Limits | Purpose in Our App |
|---|---|---|---|
| **Web Frontend** | [Vercel Hobby](https://vercel.com) | Unlimited requests, 100 GB bandwidth, free SSL | Next.js 15 App Router frontend |
| **Backend API** | [Render Free](https://render.com) (or [Fly.io](https://fly.io)) | 750 hours/month (1 shared instance) | Fastify REST API + Better Auth |
| **PostgreSQL** | [Neon Free](https://neon.tech) | 0.5 GB storage, serverless autosuspend | Users, playlists, likes, history |
| **Redis** | [Upstash Free](https://upstash.com) | 10,000 commands/day, 256 MB storage | BullMQ job queue + lyrics cache |
| **Keep-Alive Pinger**| [cron-job.org](https://cron-job.org) | Free forever | Pings `/healthz` every 10 min to stop sleep |
| **Extension Hosting**| [GitHub Releases](https://github.com) | Free unlimited downloads | Distribute unpacked `.zip` for Chrome/Firefox |
| **Domain (Optional)**| [Cloudflare Registrar](https://cloudflare.com) | At-cost (~$10/yr) or free `*.vercel.app` / `*.onrender.com` | Custom domain + free DDoS protection |

---

## 3. Step-by-Step Setup ($0 Tier)

### Step 1: Database (Neon PostgreSQL)
1. Sign up at [neon.tech](https://neon.tech).
2. Create project `music-player`.
3. Copy connection string:
   ```
   DATABASE_URL=postgres://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Run migrations locally pointing to Neon:
   ```bash
   DATABASE_URL="<neon-connection-string>" pnpm db:migrate
   ```

### Step 2: Cache & Queue (Upstash Redis)
1. Sign up at [upstash.com](https://upstash.com).
2. Create Redis database in region closest to your API (e.g. `us-east-1`).
3. Copy Redis connection string:
   ```
   REDIS_URL=rediss://default:password@xyz.upstash.io:6379
   ```

### Step 3: Backend API (Render Free Web Service)
1. Push repo to GitHub.
2. Sign up at [render.com](https://render.com) → New → **Web Service**.
3. Connect repo.
4. Settings:
   - **Root Directory**: `.`
   - **Build Command**: `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @mp/api build`
   - **Start Command**: `node backend/api/dist/server.js`
   - **Instance Type**: Free
5. Environment Variables:
   ```env
   PORT=4000
   NODE_ENV=production
   DATABASE_URL=<your-neon-url>
   REDIS_URL=<your-upstash-url>
   BETTER_AUTH_SECRET=<random-string-of-at-least-32-chars>   # required when NODE_ENV=production, e.g. openssl rand -base64 32
   BETTER_AUTH_URL=https://<your-render-app>.onrender.com
   CORS_ORIGIN=https://<your-vercel-app>.vercel.app
   ```
6. Click **Deploy**.

### Step 4: Prevent Render Free Sleep
Render Free instances spin down after 15 minutes of inactivity (causing ~30s cold starts).
1. Go to [cron-job.org](https://cron-job.org) (free account).
2. Create a cron job:
   - **URL**: `https://<your-render-app>.onrender.com/healthz`
   - **Schedule**: Every 10 minutes (`*/10 * * * *`).
3. Render stays awake 24/7 within the 750 free hours/month.

### Step 5: Web Frontend (Vercel Hobby)
1. Sign up at [vercel.com](https://vercel.com) → Add New Project → Import GitHub Repo.
2. Settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend/app`
3. Environment Variables:
   ```env
   NEXT_PUBLIC_API_URL=https://<your-render-app>.onrender.com
   ```
4. Click **Deploy**.

### Step 6: Extension Distribution
1. Build extension:
   ```bash
   pnpm --filter @mp/extension build
   ```
2. Zip the generated `.output/chrome-mv3` folder.
3. Attach `music-player-extension.zip` to a GitHub Release.
4. Add link on the web app: "Install Extension (Optional)".

---

## 4. Monitoring & Upgrade Triggers (When to leave $0)

| Metric | Trigger Threshold | Solution |
|---|---|---|
| **Upstash Redis Commands** | > 8,000 / day | Enable Upstash Pay-As-You-Go ($0.20/100k cmds) or enable in-memory LRU cache fallback |
| **Neon DB Storage** | > 400 MB | Upgrade to Neon Launch ($19/mo) — only occurs at > 50,000 active users |
| **Render API Cold Starts** | > 1 concurrent worker needed | Upgrade to Render Starter ($7/mo) or Fly.io shared CPU ($3–$5/mo) |
| **Extension Install Friction** | High volume of users | Pay one-time \$5 fee to publish on official Chrome Web Store |

---

## 5. Migration Playbook to AWS (Paid Cloud Scale)

When you secure funding or revenue, migrate to AWS with **zero application code changes**.

```
                           AWS CLOUD ARCHITECTURE
                           
                 ┌───────────────────────────────────────┐
                 │          Cloudflare / Route 53        │
                 └───────────────────┬───────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
      Amazon S3 + CloudFront (Web)             Application Load Balancer
      (or Vercel Pro)                                    │
                                               ┌─────────┴─────────┐
                                               ▼                   ▼
                                         ECS Fargate         ECS Fargate
                                         (Fastify API)       (BullMQ Worker)
                                               │                   │
                                       ┌───────┴───────┬───────────┘
                                       ▼               ▼
                                 Amazon RDS      Amazon ElastiCache
                                 (PostgreSQL)         (Redis)
```

### AWS Migration Checklist

1. **Database:**
   - Provision **Amazon RDS for PostgreSQL** (or Amazon Aurora Serverless v2).
   - Export Neon data: `pg_dump -d <neon_url> | psql -d <rds_url>`.
   - Update `DATABASE_URL` env var. Zero schema changes needed.
2. **Redis:**
   - Provision **Amazon ElastiCache for Redis** (single-node for cost efficiency, cluster for high availability).
   - Update `REDIS_URL` env var.
3. **Containers (API & Worker):**
   - Push existing Docker image to **Amazon ECR** (Elastic Container Registry).
   - Run task definitions on **AWS ECS Fargate** (serverless containers, auto-scaling).
   - Place behind an **Application Load Balancer (ALB)** with AWS Certificate Manager (free SSL).
4. **Web Frontend:**
   - Keep on **Vercel** (standard industry practice even for funded startups) OR export static build to **Amazon S3 + Amazon CloudFront CDN**.
5. **Secrets & Config:**
   - Store secrets in **AWS Secrets Manager** or **AWS Systems Manager Parameter Store**.

---

## 5. GitHub Actions CI/CD Pipeline

The repository separates CI and CD into dedicated GitHub Actions workflows:

- **Continuous Integration (`.github/workflows/ci.yml`):** Runs on push and pull requests targeting `main`.
  - Enforces 300-line limits (`pnpm check:lines`)
  - Type checking (`pnpm typecheck`)
  - Linting (`pnpm lint`)
  - Test suite execution (`pnpm test`)
  - Workspace production build (`pnpm package:ext && pnpm build`)
- **Continuous Deployment (`.github/workflows/cd.yml`):** Automatically triggered when the `CI` workflow completes successfully on `main` (also supports manual `workflow_dispatch`).
  - SSHs into the Lightsail server and updates the production environment safely without downtime.

### Required GitHub Secrets

In **GitHub Repository Settings -> Secrets and variables -> Actions**, add:

| Secret Name | Value | Required? |
| --- | --- | --- |
| `LIGHTSAIL_SSH_KEY` | Entire contents of `scripts/LightsailDefaultKey-ap-south-1.pem` (including `BEGIN`/`END` headers) | **Yes** |
| `LIGHTSAIL_HOST` | Host IP or domain (defaults to `35.154.36.24`) | Optional |
| `LIGHTSAIL_USER` | SSH user (defaults to `ubuntu`) | Optional |

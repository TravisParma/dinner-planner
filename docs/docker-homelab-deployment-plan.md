# Homelab Docker Deployment Plan

> **Status: implemented.** This is the design doc written before building the
> Docker/Basic Auth deployment (commit `30d5f62`). It's kept here as a record
> of the reasoning behind non-obvious choices (base image, standalone output,
> entrypoint script, fail-closed auth). For the current state of what's
> actually built, see [`spec.md`](spec.md) §2 (Tech stack) and §8
> (Deployment) — if the two ever disagree, `spec.md` wins.

## Context

The app originally only ran via `next dev`/`.claude/launch.json` on a dev
machine, with `DATABASE_URL` pointed at a local `prisma/dev.db` file and zero
authentication (single-user app). The goal was to host it on a home lab,
containerized with Docker Compose, reachable through an existing reverse
proxy and exposed to the internet. Since it would be internet-facing and had
no auth at all, this change also added a minimal password gate rather than
shipping the app open to the world.

Confirmed constraints:
- Docker + Docker Compose, x86_64 host — no Kubernetes, no multi-arch needed.
- A reverse proxy (not Traefik) already runs in front of homelab services;
  the compose file just publishes a plain HTTP port (no Traefik labels), with
  an easy opt-in path to attach to an external proxy network if needed.
- SQLite must survive container recreation — needs a volume, with migrations
  applied against that persisted file at container startup (not baked into
  the image).
- Auth: simple HTTP Basic Auth via Next.js middleware, credentials from env
  vars, no new DB tables or login UI. Must fail closed if unconfigured.

## 1. `next.config.ts` — standalone output

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

Emits `.next/standalone` with a minimal `server.js` and only the traced
production `node_modules` — the standard way to containerize Next.js without
shipping a full `node_modules` in the final image. Note `.next/static` and
`public/` are **not** included automatically and must be copied explicitly in
the Dockerfile.

## 2. Base image: Debian slim (not Alpine), Node 20 LTS

`node:20-bookworm-slim` for every stage.

**Why not Alpine:** Prisma's query engine is a native binary chosen by
`binaryTargets` in `prisma/schema.prisma` (left at the default, `native`,
which resolves at `prisma generate` time to match the machine's libc). Alpine
is musl libc; Debian/Ubuntu are glibc. Mixing them (e.g. generating on glibc,
running on musl) breaks at runtime with an engine mismatch, requiring an
explicit `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` addition.
Using Debian slim consistently across build and runtime stages means **no
`schema.prisma` changes are needed** — the default `native` target just
works. Debian slim still needs `openssl` installed explicitly for Prisma's
engine to link against (see Dockerfile).

Node 20 LTS is the safe pin for Next.js 16 / React 19 (which need Node ≥
18.18); avoid Node 22 unless separately verified.

## 3. `Dockerfile` (multi-stage)

```dockerfile
# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
# Prisma CLI + engines aren't pulled in by standalone tracing (nothing in app
# code imports the CLI) but are needed at runtime for `prisma migrate deploy`.
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
```

## 4. `docker-entrypoint.sh`

```sh
#!/bin/sh
set -e

echo "Running prisma migrate deploy against $DATABASE_URL..."
npx prisma migrate deploy

echo "Starting Next.js..."
exec node server.js
```

An entrypoint script (not a compose `command:` override) keeps "how this
container starts" attached to the image itself — works the same via plain
`docker run`, easier to extend later, avoids `&&`-escaping issues in YAML.
`exec node server.js` (not `npm start`) makes Node PID 1 so it receives
`SIGTERM` directly on `docker compose down`/restart for clean shutdown.

## 5. `.dockerignore`

```
node_modules
.next
.git
.gitignore
.env
.env*.local
prisma/dev.db
prisma/dev.db-journal
npm-debug.log*
README.md
docs
.claude
*.md
Dockerfile
docker-compose.yml
.dockerignore
```

Keep `prisma/schema.prisma` and `prisma/migrations/` — only the db file
artifacts are ignored, not the whole `prisma/` directory.

## 6. `docker-compose.yml`

```yaml
services:
  dinner-planner:
    build:
      context: .
      dockerfile: Dockerfile
    image: dinner-planner:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "file:/data/dev.db"
      BASIC_AUTH_USER: "${BASIC_AUTH_USER}"
      BASIC_AUTH_PASSWORD: "${BASIC_AUTH_PASSWORD}"
    volumes:
      - dinner-planner-data:/data
    # Uncomment if your reverse proxy runs as a Docker container and this
    # service should join its network instead of / in addition to the
    # published port above:
    # networks:
    #   - proxy
    #   - default

volumes:
  dinner-planner-data:

# networks:
#   proxy:
#     external: true
#     name: <your-existing-reverse-proxy-network-name>
```

- Named volume `dinner-planner-data` at `/data`, `DATABASE_URL=file:/data/dev.db`
  — persists across image rebuilds/`down && up`, and avoids host/container UID
  permission mismatches with the non-root `nextjs` user (a bind mount like
  `./data:/data` is a fine alternative if you want the file visible on the
  host for easy backup).
- `BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD` come from a `.env` file next to
  `docker-compose.yml` (compose auto-loads it) — create this with real
  values on the host; it must be gitignored, never committed.
- `restart: unless-stopped` for resilience across host reboots.
- Plain port publish, no Traefik labels; the commented `networks:` block
  documents the external-proxy-network option without forcing it.

## 7. Basic Auth middleware — `src/middleware.ts`

```ts
import { NextRequest, NextResponse } from "next/server";

export const config = {
  // Excludes all of /_next/* (not just static/image) — Turbopack's dev-mode
  // HMR websocket lives under /_next too and isn't app data, so gating it
  // just breaks live reload without any security benefit.
  matcher: ["/((?!_next/|favicon.ico).*)"],
};

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length, 32);
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i++) diff |= aPadded[i] ^ bPadded[i];
  return diff === 0;
}

function unauthorizedResponse() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Family Dinner Planner"' },
  });
}

export function middleware(req: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  // Fail closed: block everything if creds aren't configured, rather than
  // silently exposing the app to the internet.
  if (!expectedUser || !expectedPassword) {
    return new NextResponse(
      "Server misconfiguration: BASIC_AUTH_USER/BASIC_AUTH_PASSWORD not set",
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return unauthorizedResponse();
  }

  let decoded: string;
  try {
    decoded = atob(authHeader.slice("Basic ".length));
  } catch {
    return unauthorizedResponse();
  }

  const sepIndex = decoded.indexOf(":");
  if (sepIndex === -1) return unauthorizedResponse();

  const user = decoded.slice(0, sepIndex);
  const password = decoded.slice(sepIndex + 1);

  if (!timingSafeEqual(user, expectedUser) || !timingSafeEqual(password, expectedPassword)) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}
```

- Matcher protects every page and every Server Action POST (App Router routes
  Server Actions through the page path itself, so no separate rule needed) —
  only excludes `_next/*` and `favicon.ico`. (The matcher was widened from an
  initial `_next/static|_next/image` to all of `_next/` after local
  verification showed it was blocking Turbopack's dev-mode HMR websocket,
  which also lives under `/_next`.)
- Manual byte-XOR comparison instead of naive `===` since Basic Auth is the
  only auth layer — avoids leaking match-length via string-comparison timing.
  Node's `crypto.timingSafeEqual` isn't reliably available in the Edge
  middleware runtime, so this manual version is the pragmatic choice.
- **Fails closed**: missing env vars → 500 on every route, not a silent
  bypass. A misconfigured deploy is diagnosed as "every request 500s" rather
  than "no auth at all."

## 8. Prisma-in-Docker notes

- No `binaryTargets` change needed — default `native` works because build and
  runtime stages share the same Debian base.
- `prisma generate` runs in the `builder` stage; Next's build doesn't invoke
  it automatically.
- `openssl` must be installed in the final runtime image — Prisma's engine
  links against it and Debian slim doesn't ship it by default.
- Startup uses `prisma migrate deploy` (applies existing migrations only,
  non-interactive) — never `migrate dev` in a container.
- The Prisma CLI must be explicitly copied into the standalone runner image
  (see Dockerfile) since nothing in app code imports it, so Next's build
  tracing won't include it on its own.

## Verification plan

1. `docker compose build` — confirm `prisma generate` and `npm run build`
   (with `output: "standalone"`) both succeed.
2. Create `.env` next to `docker-compose.yml` with real `BASIC_AUTH_USER` /
   `BASIC_AUTH_PASSWORD` values.
3. `docker compose up -d`; `docker compose logs dinner-planner` — confirm the
   entrypoint's migrate-deploy step runs cleanly against the fresh volume and
   Next starts. (Requires migrations already existing in
   `prisma/migrations/` — `migrate deploy` only applies existing ones.)
4. `curl -i http://localhost:3000/` with no credentials → expect `401` +
   `WWW-Authenticate: Basic`.
5. `curl -i -u wrong:wrong http://localhost:3000/` → expect `401`.
6. `curl -i -u <user>:<password> http://localhost:3000/` → expect `200`.
7. In a real browser: hit the app, get the Basic Auth prompt, log in, verify
   recipe/planner/grocery pages render and a Server Action (e.g. create a
   recipe) works.
8. Persistence check: create a recipe, `docker compose down && docker compose up -d`,
   confirm the recipe is still there (proves the volume — not just the
   container — persisted the SQLite file).
9. If testing through the real reverse proxy: confirm the Basic Auth prompt
   still surfaces correctly through it (some proxies strip/mangle the
   `Authorization` header — worth an explicit check).

## Files touched

- `next.config.ts` — added `output: "standalone"`
- `Dockerfile` (new)
- `docker-compose.yml` (new)
- `docker-entrypoint.sh` (new)
- `.dockerignore` (new)
- `.gitattributes` (new) — forces LF line endings on `*.sh` regardless of a
  contributor's local `autocrlf` setting, so `docker-entrypoint.sh` can't
  pick up CRLF and break with a bad-interpreter error on the Linux image.
- `src/middleware.ts` (new)
- `docs/spec.md` — updated §2, §6, §7, and added §8

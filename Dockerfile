# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
# `prisma generate` (below) probes the machine's OpenSSL version to pick the
# matching query-engine binary. bookworm-slim doesn't ship openssl by default,
# so without installing it here, generate can't detect anything and silently
# defaults to debian-openssl-1.1.x — which then fails to load at runtime in
# the `runner` stage, which actually has openssl 3.0.x installed. Installing
# it here too makes generate see the same reality runtime will have.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
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
# The Prisma CLI (needed at runtime for `prisma migrate deploy`) isn't pulled
# in by standalone tracing — nothing in app code imports it, only @prisma/client
# (the query runtime) is. The CLI's own dependency tree (@prisma/config, and
# transitively packages like `effect`) lives at the top level of node_modules,
# not just under prisma/ and @prisma/, so cherry-picking those two directories
# isn't enough — copy the full node_modules from the builder stage instead,
# overwriting the traced one. This directory-to-directory copy also preserves
# node_modules/.bin/prisma as the symlink it is; copying that single symlinked
# file on its own dereferences it into a plain copy, which breaks the CLI's
# relative lookup of its .wasm assets next to its real (symlink target) location.
COPY --from=builder /app/node_modules ./node_modules

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown -R nextjs:nodejs /app
# Pre-create /data (the SQLite volume mount point) owned by the non-root
# runtime user — Docker seeds a fresh named volume's initial content/ownership
# from whatever already exists at that path in the image, so without this the
# volume comes up root-owned and the nextjs user can't create dev.db there.
RUN mkdir -p /data && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]

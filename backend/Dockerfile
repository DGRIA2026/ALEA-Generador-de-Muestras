FROM node:22-alpine AS builder
WORKDIR /app

RUN corepack enable && chown node:node /app

# Los ajustes de red de pnpm viven en pnpm-workspace.yaml (pnpm 11 ignora
# las variables npm_config_*).
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
USER node
# Store de pnpm en cache de BuildKit, compartido con la etapa runner.
RUN --mount=type=cache,target=/pnpm-store,sharing=locked,uid=1000,gid=1000 \
    pnpm install --frozen-lockfile --store-dir /pnpm-store

COPY --chown=node:node . .
RUN pnpm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && chown node:node /app

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
USER node
RUN --mount=type=cache,target=/pnpm-store,sharing=locked,uid=1000,gid=1000 \
    pnpm install --prod --frozen-lockfile --store-dir /pnpm-store

COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/main.js"]

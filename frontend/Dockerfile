FROM node:22-alpine
WORKDIR /app

RUN corepack enable
RUN chown node:node /app

USER node

# Los ajustes de red de pnpm (fetchTimeout, networkConcurrency) viven en
# pnpm-workspace.yaml, no aquí: pnpm 11 ignora las variables npm_config_*.
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# El store de pnpm vive en una caché de BuildKit: si el install se corta, el
# reintento reaprovecha lo ya descargado en vez de bajar todo de nuevo.
RUN --mount=type=cache,target=/pnpm-store,sharing=locked,uid=1000,gid=1000 \
    pnpm install --frozen-lockfile --store-dir /pnpm-store

COPY --chown=node:node . .
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

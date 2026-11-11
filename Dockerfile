# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts/serve.mjs ./scripts/serve.mjs
COPY --from=build /app/scripts/agent-discovery.mjs ./scripts/agent-discovery.mjs
COPY --from=build /app/package.json ./package.json
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1
USER node
CMD ["node", "scripts/serve.mjs"]

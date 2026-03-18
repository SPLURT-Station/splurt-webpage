# Multi-stage production image: Astro (Bun adapter) + PM2 (pm2-runtime as PID 1)
# https://docs.docker.com/guides/nodejs/containerize/
ARG BUN_VERSION=1.2
FROM oven/bun:${BUN_VERSION}-alpine AS deps
WORKDIR /app
ENV HUSKY=0
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM oven/bun:${BUN_VERSION}-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl \
	&& addgroup -g 1001 -S splurt \
	&& adduser -S -u 1001 -G splurt splurt

ENV NODE_ENV=production

COPY --from=deps --chown=splurt:splurt /app/node_modules ./node_modules
COPY --from=build --chown=splurt:splurt /app/dist ./dist
COPY --chown=splurt:splurt package.json bun.lock ecosystem.config.cjs ./

RUN mkdir -p logs && chown splurt:splurt logs

USER splurt
EXPOSE 4321

# PORT can be overridden via env; shell form reads it at check time
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD sh -c 'curl -fsS "http://127.0.0.1:$${PORT:-4321}/" -o /dev/null || exit 1'

# pm2-runtime keeps the process in the foreground (required for containers)
CMD ["bun", "run", "start:docker"]

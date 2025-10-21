# Multi-stage: build web, then run worker serving built assets
FROM oven/bun:1 AS build
WORKDIR /app
COPY . .
RUN bun install
RUN cd web && bun run build

FROM oven/bun:1 AS runner
WORKDIR /app
# Install global tools
RUN bun add -g wrangler miniflare
# Copy repo and built assets
COPY . .
COPY --from=build /app/web/build /app/web/build
EXPOSE 8787
# Run the worker via Miniflare; Worker serves assets from ../web/build by wrangler.jsonc
CMD ["bun", "x", "miniflare", "worker/src/index.ts", "--modules", "--port", "8787"]

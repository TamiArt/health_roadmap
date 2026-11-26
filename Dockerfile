FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run typecheck && npm test && npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
COPY --from=build --chown=node:node /app/scripts ./scripts
RUN mkdir -p /app/data /backups && chown -R node:node /app/data /backups
USER node
EXPOSE 3000
VOLUME ["/app/data", "/backups"]
CMD ["node", "server/index.mjs"]

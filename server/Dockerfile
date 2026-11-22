# Wemakeover API — production image
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci --omit=dev \
  && npx prisma generate

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Apply migrations then start (DATABASE_URL_DIRECT preferred for migrate)
CMD ["sh", "-c", "npx prisma migrate deploy && node --experimental-strip-types src/server.js"]

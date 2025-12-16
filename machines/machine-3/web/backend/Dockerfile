FROM node:18-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Backend dependencies
COPY backend/package.json backend/tsconfig.json backend/prisma ./
RUN npm install
COPY backend/src ./src
COPY storage ./storage

RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY backend/prisma ./prisma
COPY storage ./storage
COPY backend/package.json ./package.json
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001
CMD ["./docker-entrypoint.sh"]

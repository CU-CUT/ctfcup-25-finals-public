FROM node:18-alpine AS builder
WORKDIR /app

COPY frontend/package.json frontend/tsconfig.json frontend/next.config.js frontend/tailwind.config.js frontend/postcss.config.js ./ 
COPY frontend/app ./app
COPY frontend/components ./components
COPY frontend/lib ./lib
COPY frontend/types.ts ./types.ts
COPY frontend/next-env.d.ts ./next-env.d.ts
COPY frontend/public ./public
RUN npm install
ENV NEXT_PUBLIC_API_BASE_URL=/api
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000
CMD ["npm", "run", "start"]

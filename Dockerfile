# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage (use -slim not -alpine so global crypto is available for @nestjs/typeorm)
FROM node:22-slim AS runner

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

# Railway sets PORT; app reads process.env.PORT
EXPOSE 5000

CMD ["node", "dist/src/main.js"]

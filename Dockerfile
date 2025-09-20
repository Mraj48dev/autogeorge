# Multi-stage Dockerfile for AutoGeorge
# Optimized for both development and production use

# Base stage with Node.js and common dependencies
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies only when needed
FROM base AS dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV development
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production stage
FROM base AS production
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
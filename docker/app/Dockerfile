# syntax=docker/dockerfile:1

# ==============================================================================
# Next.js 15.4.6 Production Docker Image with Multi-Stage Build
# 
# This Dockerfile follows the latest Docker and Next.js best practices for 2025:
# - Multi-stage builds for optimization
# - Security-first approach with non-root user
# - Layer caching optimization for pnpm
# - Standalone output for minimal deployment
# - Health checks for monitoring
# - OpenTelemetry metrics support
# ==============================================================================

# Define build arguments for Node.js version and Alpine base
ARG NODE_VERSION=20.18.0
ARG ALPINE_VERSION=3.20

# ==============================================================================
# Stage 1: Base - Common configuration for all stages
# ==============================================================================
FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS base

# Enable pnpm - faster package manager for monorepos
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@latest

# Set working directory
WORKDIR /app

# Install security updates and required packages
RUN apk update && \
    apk add --no-cache \
    libc6-compat \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ==============================================================================
# Stage 2: Dependencies - Install production dependencies
# ==============================================================================
FROM base AS deps

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml* ./

# Use cache mount for pnpm to speed up subsequent builds
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prefer-offline

# ==============================================================================
# Stage 3: Builder - Build the application
# ==============================================================================
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set build environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application with standalone output
RUN pnpm build

# ==============================================================================
# Stage 4: Production Runtime - Minimal production image
# ==============================================================================
FROM base AS production

# Set production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create app directory and set ownership
RUN mkdir -p /app && chown nextjs:nodejs /app
WORKDIR /app

# Switch to non-root user for security
USER nextjs

# Copy standalone build output from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy instrumentation file for OpenTelemetry
COPY --from=builder --chown=nextjs:nodejs /app/instrumentation.ts ./

# Expose port
EXPOSE 3000

# Add health check for monitoring and orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["node", "server.js"]

# ==============================================================================
# Stage 5: Test Dependencies - Install test dependencies efficiently
# ==============================================================================
FROM base AS test-deps

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies including dev dependencies for testing
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ==============================================================================
# Stage 6: Test - Test environment for CI/CD
# ==============================================================================
FROM base AS test

# Copy dependencies from test-deps stage
COPY --from=test-deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Set test environment
ENV NODE_ENV=test
ENV CI=true
ENV NEXT_TELEMETRY_DISABLED=1

# Switch to non-root user for security
USER nextjs

# Run tests
CMD ["pnpm", "test"]

# ==============================================================================
# Stage 7: Development - Development environment with hot reload
# ==============================================================================
FROM base AS development

# Install all dependencies including dev dependencies
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Set development environment
ENV NODE_ENV=development

# Switch to non-root user
USER nextjs

# Expose port and debug port
EXPOSE 3000 9229

# Start development server with hot reload and debugging
CMD ["pnpm", "dev"]
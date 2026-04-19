# ─── Production Dockerfile for Node.js / Express Backend ─────────────────────
FROM node:20-alpine

# Set NODE_ENV to production so npm ci skips devDependencies
ENV NODE_ENV=production

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy the rest of the server source code
COPY . .

# Create a non-root user and switch to it (security best practice)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the port the Express server listens on
EXPOSE 4000

# Use the start script defined in package.json
CMD ["node", "server.js"]

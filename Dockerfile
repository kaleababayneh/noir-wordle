# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with legacy peer deps flag
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files for production dependencies
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --legacy-peer-deps --omit=dev

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Expose the port (Dokploy will inject the PORT env var)
EXPOSE 5173

# Start the preview server
# Use shell form to allow PORT environment variable substitution
CMD npm run preview -- --host 0.0.0.0 --port ${PORT:-5173}

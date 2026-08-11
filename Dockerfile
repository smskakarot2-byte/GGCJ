# Start from Node 20 Alpine
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install prerequisites and enable corepack for pnpm
RUN apk add --no-cache bash curl git build-base python3 \
  && corepack enable

# Copy package manifests first for better caching
COPY package.json pnpm-lock.yaml* ./
COPY scripts/package.json ./scripts/
COPY artifacts/api-server/package.json ./artifacts/api-server/

# Copy the rest of the repo
COPY . .

# Install workspace dependencies (including dev deps needed for build)
RUN pnpm install --recursive

# Build the workspace
RUN pnpm run build

# Expose port and default environment
ENV PORT=3000
EXPOSE 3000

# Run the api server
WORKDIR /app/artifacts/api-server
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]

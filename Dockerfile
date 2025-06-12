# Use Node.js LTS as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy source files
COPY src ./src

# Install TypeScript for building
RUN npm install --save-dev typescript

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Set environment variables
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup --system mcp && \
    adduser --system --ingroup mcp mcp

# Set ownership
RUN chown -R mcp:mcp /app

# Switch to non-root user
USER mcp

# Command to run the application
CMD ["node", "dist/index.js"]
FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S storyforge && \
    adduser -S storyforge -u 1001 -G storyforge && \
    chown -R storyforge:storyforge /app

USER storyforge

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/auth/me || exit 1

CMD ["node", "server.js"]

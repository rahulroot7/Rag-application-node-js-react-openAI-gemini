# Multi-stage production Dockerfile
FROM node:20-alpine AS base

# Install build dependencies if needed
RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

# Create uploads directory with appropriate permissions
RUN mkdir -p uploads && chown -R node:node /usr/src/app

USER node

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/server.js"]

# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
RUN npm ci

# Build the app
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.27-alpine
# Healthcheck needs curl
RUN apk add --no-cache curl

# Nginx config (SPA routing + proper MIME for 3D assets)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static files produced by Vite (default: /app/dist)
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD curl -fsS http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]

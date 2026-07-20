# --- Stage 1: build the static assets -------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Install deps first so this layer is cached unless package*.json changes
COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# --- Stage 2: serve with nginx ---------------------------------------------
# Final image only contains the compiled static bundle + nginx — no
# Node.js, no source, no node_modules. Typically <30MB.
FROM nginx:1.27-alpine

# gettext provides `envsubst`, used by docker-entrypoint.sh to render the
# nginx config from the BACKEND_URL env var at container startup.
RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/nginx.conf.template
COPY docker/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Default so the container doesn't crash if BACKEND_URL isn't set; override
# via the Kubernetes Deployment env (see k8s/deployment.yaml).
ENV BACKEND_URL=http://localhost:9999

# Run as the existing non-root nginx user for a smaller attack surface.
RUN chown -R nginx:nginx /usr/share/nginx/html
USER nginx

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]

#!/bin/sh
set -e

# Render the nginx config from the template.
# BACKEND_UPLOADS_URL is a *runtime* variable (Dokploy Environment tab):
# changing it only needs a container Restart, never a rebuild.
: "${BACKEND_UPLOADS_URL:=http://mowakba-backend-dev-hnfhqd:8080}"
export BACKEND_UPLOADS_URL

envsubst '${BACKEND_UPLOADS_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "[entrypoint] Proxying /uploads/ to ${BACKEND_UPLOADS_URL}"

exec "$@"

#!/bin/sh
set -eu

# This app's static files are built once at image-build time, but a couple
# of things still need to be resolved at container-start time so the same
# image works unmodified across dev/staging/prod namespaces:
#
#   1. BACKEND_URL — where nginx proxies /api/* requests to.
#   2. HOSTNAME     — Kubernetes sets this to the pod name automatically;
#                      we surface it on /healthz so you can watch a
#                      Service load-balance traffic across replicas.

mkdir -p /usr/share/nginx/html/meta
cat <<EOF > /usr/share/nginx/html/meta/health.json
{"status":"ok","pod":"${HOSTNAME:-unknown}","backendUrl":"${BACKEND_URL:-not-configured}"}
EOF

# Restrict envsubst to just BACKEND_URL so nginx's own $host/$uri/etc.
# variables in the template are left untouched.
envsubst '${BACKEND_URL}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'

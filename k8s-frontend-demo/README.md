# k8s-frontend-demo

A minimal React todo app, deliberately simple, built to practice Kubernetes
mechanics (containerization, scaling, rolling updates, service discovery)
rather than frontend engineering.

## How it's put together

- **App**: React + Vite. Fetches `/api/todos` on load; if nothing answers
  it falls back to local demo data instead of erroring out, so the app is
  always demoable.
- **Container**: multi-stage `Dockerfile` — Node builds the static bundle,
  then a small `nginx:alpine` image serves it on port `3000`. Final image
  is typically under 30MB.
- **Runtime config**: `BACKEND_URL` is read from the container's
  environment *at startup* (not baked in at build time) and rendered into
  the nginx config via `envsubst`. That means the same image can point at
  a different backend in every namespace/cluster just by changing an env
  var on the Deployment — no rebuild needed.
- **`/healthz`**: served directly by nginx (not proxied), and includes the
  pod's hostname. Kubernetes sets `HOSTNAME` to the pod name automatically,
  so this is a cheap way to watch a Service load-balance traffic across
  replicas when you scale up.

## 1. Build and run locally with Docker

```bash
docker build -t k8s-frontend-demo:latest .

docker run --rm -p 3000:3000 \
  -e BACKEND_URL=http://localhost:9999 \
  k8s-frontend-demo:latest
```

Visit `http://localhost:3000`. Since nothing is listening on
`localhost:9999`, you'll see the "no backend reachable" banner and demo
todos — that's expected. Check `http://localhost:3000/healthz` to see the
pod-identity payload (it'll show the container's hostname).

### Local dev without Docker

```bash
npm install
npm run dev
```

This proxies `/api` to `http://localhost:8080` by default (see
`vite.config.js`); set `DEV_BACKEND=http://host:port` to point elsewhere.

## 2. Push the image somewhere your cluster can pull it from

**minikube** (no registry needed):
```bash
eval $(minikube docker-env)
docker build -t k8s-frontend-demo:latest .
```

**Docker Desktop Kubernetes** — the image you build locally is already
visible to the cluster, no push needed.

**A real registry** (ACR, ECR, GCR, Docker Hub, etc.):
```bash
docker tag k8s-frontend-demo:latest <registry>/k8s-frontend-demo:v1
docker push <registry>/k8s-frontend-demo:v1
```
Then update `image:` in `k8s/deployment.yaml` to match.

## 3. Deploy to Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml   # optional, needs an ingress controller
```

Check rollout status:
```bash
kubectl rollout status deployment/k8s-frontend-demo
kubectl get pods -l app=k8s-frontend-demo
```

## 4. Test the deployment

**Port-forward (fastest, no ingress needed):**
```bash
kubectl port-forward svc/k8s-frontend-demo 8080:80
```
Open `http://localhost:8080`.

**Via ingress:**
```bash
minikube addons enable ingress          # minikube only
echo "$(minikube ip) k8s-frontend-demo.local" | sudo tee -a /etc/hosts
```
Then visit `http://k8s-frontend-demo.local`.

## 5. Things worth practicing with this setup

- **Scale**: `kubectl scale deployment/k8s-frontend-demo --replicas=5`, then
  refresh `/healthz` a few times (through port-forward or ingress, not a
  single long-lived tab) and watch the reported pod name change as the
  Service load-balances across replicas.
- **Rolling update**: change something in `src/App.jsx`, rebuild with a new
  tag, update `image:` in `deployment.yaml`, `kubectl apply -f` it, and
  watch `kubectl rollout status` — `maxUnavailable: 0` in the manifest
  means it won't drop capacity mid-rollout.
- **Rollback**: `kubectl rollout undo deployment/k8s-frontend-demo`.
- **Point at a real backend**: deploy any API that serves
  `GET/POST /todos` as its own Deployment + Service, then set `BACKEND_URL`
  in `deployment.yaml` to that Service's in-cluster DNS name
  (`http://<service>.<namespace>.svc.cluster.local:<port>`) and re-apply —
  no image rebuild required.
- **Probes**: kill `/healthz` temporarily (e.g. exec into a pod and stop
  nginx) and watch the liveness probe restart it.

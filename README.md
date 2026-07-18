# ForgeGateway

A standalone React/Vite web UI for the ForgeSphere/Apigee-style API Gateway: proxies, shared flows, API products, developer apps, environments, onboarding, governance/OWASP scanning, and Apigee X / Kong Konnect integration — extracted from the broader `forgesphere-api-lifecycle` app so the Gateway product can be deployed and versioned independently.

Built with **React**, **Vite**, and **Tailwind CSS**.

## Features

- **Gateway shell** (`/gateway`) — proxies, shared flows, API products, consumer apps, developers, environments, onboarding, governance/OWASP scans, plus embedded Observability, Deploy, API Test, Profile/Audit Log tabs
- **Gateway onboarding wizards** — Apigee X (`/proxy-generate`), Kong Konnect (`/kong-generate`), ForgeSphere Gateway (`/fs-gateway-generate`)
- **Integration config** — Apigee X (`/config/apigee-x`), Kong Konnect (`/config/kong`)

## How to run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). To build for production:

```bash
npm run build
```

Then serve the `dist` folder (e.g. `npx serve dist`, or the included Docker/nginx setup).

## Backend

This UI talks to the same ForgeSphere backend as the source app (`src/config/apiConfig.js`, `apigeeConfig.js`, `kongConfig.js`) — no separate backend to stand up. If you need a different environment, update the base URLs there.

### `.env.development`

A handful of `VITE_`-prefixed vars are read via `import.meta.env` by surviving code (see file for the current list). None are required for the core gateway flows to load; supply real values only if you use the features that depend on them.

## Deploy

| File | Purpose |
|------|--------|
| `Dockerfile` | Multi-stage: build with Node, serve with nginx. |
| `nginx.conf` | SPA routing: serve `index.html` for all routes. |
| `firebase.json` | Firebase Hosting config — `site` is set to the placeholder `forge-gateway`; create that Firebase Hosting site (or point it at a real one) before deploying. |
| `cloudbuild.yaml` | Cloud Build: build image, push to Artifact Registry, deploy to Cloud Run. |

```bash
npm run build
docker build -t forge-gateway .
docker run -p 8080:80 forge-gateway
```

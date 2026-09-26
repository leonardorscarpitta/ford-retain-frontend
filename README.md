# Ford Retain: frontend

Next.js app for Ford Retain: new features for Ford's existing customer
platform, aimed at keeping owners with Ford. The platform already sends owners
maintenance alerts on WhatsApp; this app adds a place where they can:

- sign in and see only their own vehicles,
- switch between the vehicles in their garage,
- see a summary of their maintenance notifications,
- check vehicle telemetry: component health and estimated battery life,
  on an interactive 3D model of their truck,
- schedule (and cancel) maintenance at a dealership,
- find nearby Ford dealerships on a map, using their own location.

This repository is the **front-end**: Next.js 16 (App Router), React 19,
TypeScript, plain CSS, three.js for the 3D vehicle and Leaflet for the map. All
data comes from the Go API in **ford-retain-backend**.

## Quick start

Only Docker is required; Node never needs to be installed on the host.

1. Start the API: clone **ford-retain-backend** and run `make dev` there. It
   creates the `ford-retain` Docker network.
2. Start this app:

   ```sh
   make dev          # or: docker compose up
   ```

3. Open http://localhost:3000 and sign in with a demo account:

   | Email               | Password           | Vehicles                            |
   |---------------------|--------------------|-------------------------------------|
   | `ana@example.com`   | `ford-retain-demo` | F-150 Lariat PowerBoost, F-150 Lightning |
   | `bruno@example.com` | `ford-retain-demo` | Ranger Raptor                       |

The dev container joins the `ford-retain` network and calls the API as
`http://backend:8080`, with hot reload (`next dev`). `make dev` stops with a
hint if the API's network isn't there yet.

### Production build

```sh
make prod         # or: docker compose -f compose.prod.yaml up --build
```

`Dockerfile`: Next.js `standalone` output on `node:24-alpine`, running as
non-root. It expects the API on the `ford-retain` network (ford-retain-backend's
`make prod`), or set `API_URL`.

## Architecture

```
browser ──► Next.js (server components + server actions) ──► ford-retain-backend API
```

The browser only talks to Next.js. Pages fetch data in **Server Components**
and change it through **Server Actions**, so the API is called
server-to-server (`src/lib/api.ts`). The API contract (routes, errors, slots)
is documented in the ford-retain-backend README.

## Authentication

Sign-in, sessions and access control are decided by the API
(ford-retain-backend); see its README. On this side:

```
browser ──cookie──► Next.js ──Authorization: Bearer──► API
```

- The `login` Server Action stores the API's session token in an HTTP-only,
  `SameSite=Lax` `session` cookie (`Secure` in production). The browser never
  sees or sends the token to the API itself; `lib/api.ts` attaches it as a
  bearer token on server-side calls.
- A locked account (`429` from the API) shows how long to wait.
- **Front-end checks are for navigation, not security:** `src/proxy.ts` sends
  requests without a session cookie to `/login?next=…`, and any `401` from the
  API redirects through `/auth/expired`, which clears the cookie.
- The login page lists the demo accounts in development builds only.

## Code layout

```
src/
├── app/
│   ├── layout.tsx              # font, top bar
│   ├── globals.css             # design system: tokens, type, chips, buttons, inputs, bars
│   ├── page.tsx                # dashboard: headline figures, 3D truck, systems, battery trend, alerts
│   ├── schedule/page.tsx       # booking form, upcoming (cancellable), service history by year
│   ├── dealerships/page.tsx    # geolocation, service filters, nearest-first list, map + details
│   ├── loading.tsx / error.tsx # skeleton and retry screen
│   ├── login/                  # sign-in page and form
│   ├── auth/expired/route.ts   # clears a rejected session, back to /login
│   └── actions.ts              # Server Actions: login, logout, switch vehicle, mark read, schedule, cancel
├── components/
│   ├── vehicle/                # 3D truck scene + explorer UI (details panel, zone chips)
│   └── …                       # vehicle switcher, sparkline, nav, page header, locate/cancel buttons, icons
└── lib/
    ├── api.ts                  # typed API client, server-only; adds the bearer token
    ├── session.ts              # getUser(): signed-in user or null
    ├── cookies.ts              # cookie names
    ├── garage.ts               # current vehicle (cookie) + vehicle list, cached per request
    └── format.ts               # status tones, dates (America/Sao_Paulo), health score
```

### Design

- **Minimal and light, in Ford colours.** White surfaces, hairline dividers
  instead of cards, one typeface (Inter), and Ford Blue `#00095B` for primary
  actions, with Bright Blue `#066FEF` for links and data. Tokens live at the top
  of `globals.css`; page layout is in `*.module.css` next to each page. Plain CSS,
  no UI kit.
- **One big number per view.** On the dashboard that's vehicle health; the other
  figures sit beside it at a smaller size.
- **Status is never color alone.** The four tones (good / warning / critical /
  info) always come with an icon and a label (`ToneIcon`, `toneLabel`). Status
  colors are reserved for status.
- **Motion is kept to what explains something:** the 3D parts opening, and a
  short fade between pages (`<ViewTransition>`). Both are reduced under
  `prefers-reduced-motion`.
- **Deep links:** `/schedule?service=…&dealership=…` pre-fills the booking form
  (used by "Book a fix" and "Book here"); `/dealerships?service=…&id=…&lat=…&lng=…`
  filters, selects and sorts from a point.
- Dates render in `America/Sao_Paulo`. The booking form converts the picked
  local time to ISO in the browser before submitting.

### Switching vehicles

The top bar has a vehicle picker (`components/vehicle-switcher.tsx`). Choosing
one runs the `selectVehicle` Server Action, which stores the VIN in an
HTTP-only `vin` cookie and revalidates every page. Pages, the layout and
actions all read the current vehicle through `getGarage()` in `lib/garage.ts`,
which falls back to the first vehicle when the cookie is missing or stale. With
authentication, this is where the owner's garage would be looked up.

### 3D vehicle (`components/vehicle/`)

A stylised Ford pickup (modelled on a 2022 F-150 SuperCrew), painted in the
selected vehicle's colour and built in code from primitives and extruded side
profiles, with no model file to license or load.
It uses `@react-three/fiber` and `@react-three/drei`. Lighting comes from local
light-formers, so there are no HDR downloads.

Each telemetry **zone** maps to a part that opens when clicked:

| Zone         | Part clicked            | What happens                      |
|--------------|-------------------------|-----------------------------------|
| `engine-bay` | hood                    | hood lifts, engine lights up      |
| `cabin`      | any door                | all four doors swing open         |
| `front-wheel`| front wheels            | wheels steer and spin             |
| `rear-wheel` | rear wheels             | wheels spin                       |
| `underbody`  | frame                   | body lifts off the chassis        |

The tailgate also drops on click. A beacon over each zone shows its worst
status, and a details panel lists that zone's components. The zone chips under
the canvas do the same thing and are the keyboard-accessible path. The scene
only loads in the browser (`next/dynamic` with `ssr: false`) and falls back to a
message when WebGL is unavailable.

To add a zone: add it to `Zone` in `lib/api.ts` and to the API (`telemetry` package in
ford-retain-backend),
give it a label in `lib/format.ts`, and add a `FOCUS` point and a clickable
`<Part zone=…>` in `truck-scene.tsx`.

### Map and location

The map (`components/dealer-map/`) is Leaflet via `react-leaflet`, loaded in
the browser only. Every dealership in the current filter is a marker; clicking
one selects it (`?id=`), and the map flies to the selection. Your location, when
shared, is a green marker. Markers are CSS `divIcon`s (styled in `globals.css`),
so there are no marker images to bundle. Tiles come from
`tile.openstreetmap.org`: fine for development, but OSM's tile usage policy
rules out production traffic, so point `TileLayer` at a tile provider (with an
API key) before launch. Keep the OSM attribution visible. "Use my location"
asks the browser for the position and re-sorts dealerships around it. Without
it, dealerships are sorted from central São Paulo.

> Next.js 16 changed several APIs. Before writing code, read the docs shipped
> in `node_modules/next/dist/docs/` (see `AGENTS.md`).

## Configuration

| Variable  | Default                 | Purpose |
|-----------|-------------------------|---------|
| `API_URL` | `http://localhost:8080` | API base URL, used server-side (`make dev` sets `http://backend:8080`) |

## Development

```sh
make check   # npm ci, lint, production build (type-checks), in Docker, the build checks the pipeline runs
make lint
```

Any other npm/next command through Docker:

```sh
docker run --rm -it -u $(id -u):$(id -g) -e HOME=/tmp -v "$PWD":/app -w /app node:24-alpine npm run lint
```

Branches follow git flow: `master` (releases), `develop` (integration),
`feat/*` and `bugfix/*` for work. Commits follow
[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

## CI/CD pipeline

`.gitea/workflows/pipeline.yml` (Gitea Actions) runs on every push to
`develop`. Each stage is a job, and a job fails the pipeline:

| Stage | Tool | Fails on |
|-------|------|----------|
| Exposed credential check | [gitleaks](https://github.com/gitleaks/gitleaks), whole git history | any leaked secret |
| SAST | [semgrep](https://semgrep.dev) CE (`p/javascript`, `p/typescript`, `p/react`, `p/dockerfile`) | any finding |
| SCA + SBOM | [syft](https://github.com/anchore/syft) (CycloneDX SBOM, kept as the `sbom` artifact) + [grype](https://github.com/anchore/grype) | fixable high/critical CVE |
| Build + Tests | `npm ci`, lint, `next build` (type-checks), `docker build`, smoke test of the image; pushes it as `:<commit sha>` | any error |
| Container scan | grype on the pushed image | fixable high/critical CVE |
| DAST | [OWASP ZAP](https://www.zaproxy.org) baseline against the running image (report in the `zap-report` artifact) | any WARN/FAIL alert |
| Release | writes the image SHA to `deploy/kustomization.yaml` on `develop` (`[skip ci]`); pushes only, skipped on manual runs | |

The first three stages run in parallel; container scan and DAST run in
parallel after the build. None of the tools needs an account: they are pinned
releases verified by SHA-256 (the ZAP image and the actions are pinned by digest/commit).
To accept a DAST alert as a known risk, add its rule to `.zap/rules.tsv`
(`<id>\tIGNORE\t<reason>`) with a justification.

**Deployment (GitOps).** `deploy/` is a Kustomize app (Deployment, Service and
a Traefik Ingress; non-root, read-only root filesystem). An image is only deployable once `release`
writes its tag there, i.e. after every gate passed. `argocd/application.yaml` points
Argo CD at `deploy/` on `master`, so a release reaches the cluster when `develop`
is merged into `master`. Apply it once with
`kubectl apply -n argocd -f argocd/application.yaml`.

**Setup.**

- Repository secrets: `CI_USERNAME` (the Gitea user owning the token) and
  `CI_TOKEN`, a Gitea access token with `write:package` (push/pull the image) and
  `write:repository` (the release commit). If `develop` is protected, allow
  that user to push.
- Runner: an `act_runner` with the `ubuntu-latest` label on an image that has
  Docker CLI, Node and Python (e.g. `gitea/runner-images:ubuntu-latest`), with the
  Docker socket available to jobs (act_runner's default).
- Cluster: see below.

### Linking a K3s + Argo CD environment

Run once on the VM (K3s's `kubectl`). Argo CD pulls from Gitea, so the VM needs
outbound HTTPS to `gitea.lucasggmoreira.com.br`; nothing has to reach the VM
from Gitea. Create one more Gitea access token for the cluster, with read-only
scopes: `read:repository` and `read:package`.

```sh
TOKEN=<read-only token>; USER=<its Gitea user>

# 1. Let Argo CD read this repository.
kubectl -n argocd create secret generic repo-ford-retain-frontend \
  --from-literal=type=git \
  --from-literal=url=https://gitea.lucasggmoreira.com.br/neo/ford-retain-frontend.git \
  --from-literal=username="$USER" --from-literal=password="$TOKEN"
kubectl -n argocd label secret repo-ford-retain-frontend argocd.argoproj.io/secret-type=repository

# 2. Let K3s pull the image from the Gitea registry.
kubectl create namespace ford-retain
kubectl -n ford-retain create secret docker-registry gitea-registry \
  --docker-server=gitea.lucasggmoreira.com.br \
  --docker-username="$USER" --docker-password="$TOKEN"

# 3. Register the app (from a checkout of this repo, or paste the file).
kubectl apply -n argocd -f argocd/application.yaml
```

Argo CD then syncs `deploy/` from `master`. The app is served by K3s's
Traefik on the VM's IP. Use `https://<vm-ip>` (Traefik's default self-signed
certificate until there's a domain): the session cookie is `Secure`, so
signing in over plain HTTP doesn't work. The frontend calls the API at
`http://ford-retain-backend:8080`, so ford-retain-backend must be deployed in
the same `ford-retain` namespace under that Service name.

Check it with `kubectl -n argocd get application ford-retain-frontend` (should
be `Synced`/`Healthy`) and `kubectl -n ford-retain get pods`. Until the first
release reaches `master`, the image tag is `unreleased` and pods sit in
`ImagePullBackOff`; that's expected.

## Next steps

- **Map tiles:** a production tile provider (see Map and location).
- **Identity:** when the API switches to Ford's identity provider, the login
  page and `login` Server Action change to that provider's sign-in flow.

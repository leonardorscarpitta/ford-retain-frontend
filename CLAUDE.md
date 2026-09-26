@AGENTS.md

# Ford Retain: frontend

## Project brief

Original brief (verbatim):

> The goal is to retain the customer with Ford; to achieve this, the team decided to evolve the existing platform. Users receive WhatsApp alerts regarding their vehicle's maintenance needs. Within the platform, users can view a summary of notifications concerning required repairs, as well as vehicle telemetry data—such as component health and estimated remaining battery life. The platform also allows users to schedule future maintenance and locate nearby Ford dealerships on a map.
>
> you need to create:
> 1. A front-end using React with Next.js
> 2. A back-end in Go (Golang)—structured as a modular monolith following Go best practices
> 3. A README.md file documenting everything for other developers
>
>
> Don't overengineer.

It was split into two repositories: **ford-retain-frontend** (this one,
Next.js) and **ford-retain-backend** (the Go API). The brief's README
requirement applies to each.

## Working in this repo

- Read `README.md` for layout and commands; keep it up to date for other
  developers.
- Next.js 16: read `AGENTS.md` and the bundled docs before using a Next.js API.
- Data is fetched in Server Components via `src/lib/api.ts`; mutations go
  through Server Actions in `src/app/actions.ts`. The API contract lives in
  ford-retain-backend's README.
- Keep it simple: plain CSS; dependencies beyond Next/React are three.js
  (`@react-three/fiber` + `drei`) for the 3D vehicle and Leaflet
  (`react-leaflet`) for the map. No new ones without a clear need.
- Ford already owns identity, vehicles, telemetry, WhatsApp alerts and dealers:
  the app shows them through the API rather than rebuilding them.
- Node is not installed on the host: use `make dev` / `make check` (Docker).
  `make check` runs what CI runs, so run it before committing.

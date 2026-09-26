# Common tasks. Node runs in Docker (node:24-alpine); nothing needs installing on the host.
NODE = docker run --rm -u $$(id -u):$$(id -g) -e HOME=/tmp -e NEXT_TELEMETRY_DISABLED=1 -v "$(CURDIR)":/app -w /app node:24-alpine

.PHONY: dev down check lint build prod network

dev: network ## App on http://localhost:3000 (start ford-retain-backend first)
	docker compose up

down:
	docker compose down

check: ## Everything CI runs: npm ci, lint, production build (type-checks)
	$(NODE) sh -c "npm ci --silent && npm run lint && npm run build"

lint:
	$(NODE) npm run lint

build: network ## Build the production image
	docker compose -f compose.prod.yaml build

prod: network ## Run the production image
	docker compose -f compose.prod.yaml up --build

# The API's compose stack creates this network; fail early with a clear hint.
network:
	@docker network inspect ford-retain >/dev/null 2>&1 || { \
		echo "The ford-retain network doesn't exist: run 'make dev' in ford-retain-backend first."; exit 1; }

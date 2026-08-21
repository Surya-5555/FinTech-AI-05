install:
	pnpm install

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test

evaluate:
	pnpm evaluate

verify: install lint typecheck test
	@echo "All checks passed"

clean:
	pnpm clean

# --- Docker Compose Demo Targets ---
demo-up:
	docker compose up --build -d

demo-down:
	docker compose down

demo-reset:
	@echo "WARNING: This will destroy the local database and Redis volumes!"
	docker compose down -v
	rm -rf artifacts/*

demo-logs:
	docker compose logs -f api worker frontend

demo-status:
	docker compose ps

demo-seed:
	@echo "Running idempotent seed..."
	# Normally runs inside api container or host if DB exposed. For this phase, handled by entrypoint or manual run.

demo-smoke:
	npx tsx scripts/demo-smoke.ts

demo-evaluate:
	docker compose --profile evaluation up rr-evaluator

demo-failure:
	docker compose --profile failure-demo up rr-failure-demo

demo-verify: demo-up
	@echo "Waiting for services to be healthy..."
	sleep 15
	make demo-status
	make demo-smoke
	@echo "Demo frontend available at http://localhost:5173"

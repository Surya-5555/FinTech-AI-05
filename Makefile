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

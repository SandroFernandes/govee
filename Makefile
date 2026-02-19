.PHONY: test test-backend test-frontend smoke

test:
	docker compose up -d
	$(MAKE) test-backend
	$(MAKE) test-frontend

test-backend:
	docker compose exec -T backend python manage.py test

test-frontend:
	docker compose exec -T frontend bun run test

smoke:
	docker compose up -d
	@echo "Waiting for proxied health endpoint..."
	@attempt=0; \
	until [ $$attempt -ge 30 ]; do \
		if curl -fsS http://localhost:5173/api/health/ | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then \
			echo "Smoke check passed"; \
			exit 0; \
		fi; \
		attempt=$$((attempt + 1)); \
		sleep 1; \
	done; \
	echo "Smoke check failed: frontend proxy or backend health endpoint unavailable"; \
	exit 1

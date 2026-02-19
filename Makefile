.PHONY: test test-backend test-frontend

test:
	docker compose up -d
	$(MAKE) test-backend
	$(MAKE) test-frontend

test-backend:
	docker compose exec -T backend python manage.py test

test-frontend:
	docker compose exec -T frontend bun run test

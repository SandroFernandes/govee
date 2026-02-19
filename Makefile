.PHONY: test test-backend test-frontend test-hardware test-hardware-perms test-hardware-mac smoke

test:
	docker compose up -d
	$(MAKE) test-backend
	$(MAKE) test-frontend

test-backend:
	docker compose exec -T backend python manage.py test

test-frontend:
	docker compose exec -T frontend bun run test

test-hardware:
	docker compose up -d --build backend
	docker compose exec -T \
		-e RUN_HARDWARE_TESTS=1 \
		-e GOVEE_TEST_TIMEOUT=$${GOVEE_TEST_TIMEOUT:-15} \
		-e GOVEE_TEST_MAC=$${GOVEE_TEST_MAC:-} \
		-e GOVEE_TEST_NAME=$${GOVEE_TEST_NAME:-H5075} \
		backend python manage.py test app.tests.ReadH5075HardwareCommandTests

test-hardware-perms:
	docker compose up -d --build backend
	docker compose exec -T \
		-e RUN_HARDWARE_TESTS=1 \
		backend python manage.py test app.tests.ReadH5075HardwareCommandTests.test_bluetooth_permissions_allow_scan

test-hardware-mac:
	@if [ -z "$$GOVEE_TEST_MAC" ]; then \
		echo "GOVEE_TEST_MAC is required, e.g. GOVEE_TEST_MAC=AA:BB:CC:DD:EE:FF make test-hardware-mac"; \
		exit 1; \
	fi
	docker compose up -d --build backend
	docker compose exec -T \
		-e RUN_HARDWARE_TESTS=1 \
		-e GOVEE_TEST_TIMEOUT=$${GOVEE_TEST_TIMEOUT:-15} \
		-e GOVEE_TEST_MAC=$${GOVEE_TEST_MAC} \
		backend python manage.py test app.tests.ReadH5075HardwareCommandTests.test_command_reads_specific_mac_when_provided

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
